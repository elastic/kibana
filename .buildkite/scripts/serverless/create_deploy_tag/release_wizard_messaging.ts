/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildkite,
  COMMIT_INFO_CTX,
  CURRENT_COMMIT_META_KEY,
  DEPLOY_TAG_META_KEY,
  DRY_RUN_CTX,
  octokit,
  SELECTED_COMMIT_META_KEY,
  sendSlackMessage,
} from './shared';
import { GithubCommitType } from './info_sections/commit_info';
import { getUsefulLinks } from './info_sections/useful_links';

const WIZARD_CTX_INSTRUCTION = 'wizard-instruction';
const WIZARD_CTX_DEFAULT = 'wizard-main';

const IS_DRY_RUN = process.env.DRY_RUN?.match(/(1|true)/i);
const IS_AUTOMATED_RUN = process.env.AUTO_SELECT_COMMIT?.match(/(1|true)/i);

type StateNames =
  | 'start'
  | 'initialize'
  | 'collect_commits'
  | 'wait_for_selection'
  | 'collect_commit_info'
  | 'wait_for_confirmation'
  | 'create_deploy_tag'
  | 'tag_created'
  | 'trigger_gpctl'
  | 'end'
  | 'error_generic';

interface StateShape {
  name: string;
  description: string;
  instruction?: string;
  instructionStyle?: 'success' | 'warning' | 'error' | 'info';
  display: boolean;
  skipWhenAutomated?: boolean;
  pre?: (state: StateShape) => Promise<void | boolean>;
  post?: (state: StateShape) => Promise<void | boolean>;
}

const states: Record<StateNames, StateShape> = {
  start: {
    name: 'Starting state',
    description: 'No description',
    display: false,
    post: async () => {
      if (IS_DRY_RUN) {
        buildkite.setAnnotation(
          DRY_RUN_CTX,
          'warning',
          `Dry run: tag won't be pushed, slack won't be notified.`
        );
      }

      buildkite.setAnnotation(COMMIT_INFO_CTX, 'info', `<h4>:kibana: Recent commits...</h4>`);
    },
  },
  initialize: {
    name: 'Initializing',
    description: 'The job is starting up.',
    instruction: 'Wait while we bootstrap. Follow the instructions displayed in this block.',
    instructionStyle: 'info',
    display: true,
  },
  collect_commits: {
    name: 'Collecting commits',
    description: 'Collecting potential commits for the release.',
    instruction: `Please wait, while we're collecting the list of available commits.`,
    instructionStyle: 'info',
    display: true,
  },
  wait_for_selection: {
    name: 'Waiting for selection',
    description: 'Waiting for the Release Manager to select a commit.',
    instruction: `Please find, copy and enter a commit SHA to the buildkite input box to proceed.`,
    instructionStyle: 'warning',
    skipWhenAutomated: true,
    display: true,
  },
  collect_commit_info: {
    name: 'Collecting commit info',
    description: 'Collecting supplementary info about the selected commit.',
    instruction: `Please wait, while we're collecting data about the commits.`,
    instructionStyle: 'info',
    display: true,
    pre: async () => {
      buildkite.setAnnotation(COMMIT_INFO_CTX, 'info', `<h4>:kibana: Selected commit info:</h4>`);
    },
  },
  wait_for_confirmation: {
    name: 'Waiting for confirmation',
    description: 'Waiting for the Release Manager to confirm the release.',
    instruction: `Please review the collected information above and unblock the release on Buildkite, if you're satisfied.`,
    instructionStyle: 'warning',
    skipWhenAutomated: true,
    display: true,
  },
  create_deploy_tag: {
    name: 'Creating deploy tag',
    description: 'Creating the deploy tag, this will be picked up by another pipeline.',
    instruction: `Please wait, while we're creating the deploy@timestamp tag.`,
    instructionStyle: 'info',
    display: true,
  },
  tag_created: {
    name: 'Release tag created',
    description: 'The initial step release is completed, follow up jobs will be triggered soon.',
    instruction: `<h3>Deploy tag successfully created!</h3>`,
    instructionStyle: 'success',
    display: true,
  },
  trigger_gpctl: {
    name: 'Triggering GPCTL deployment',
    description: 'Triggering the GPCTL deployment for the release - sit back and relax.',
    instruction: `GPCTL deployment triggered, follow the trigger step for more info.`,
    instructionStyle: 'info',
    display: true,
  },
  end: {
    name: 'End of the release process',
    description: 'The release process has ended.',
    pre: async () => {
      // The deployTag here is only for communication, if it's missing, it's not a big deal, but it's an error
      const deployTag =
        buildkite.getMetadata(DEPLOY_TAG_META_KEY) ||
        (console.error(`${DEPLOY_TAG_META_KEY} not found in buildkite meta-data`), 'unknown');
      const selectedCommit = buildkite.getMetadata(SELECTED_COMMIT_META_KEY);
      const currentCommitSha = buildkite.getMetadata(CURRENT_COMMIT_META_KEY);

      buildkite.setAnnotation(
        WIZARD_CTX_INSTRUCTION,
        'success',
        `<h3>Release successfully initiated!</h3>`
      );

      if (!selectedCommit) {
        // If we get here with no selected commit set, it's either an unsynced change in keys, or some weird error.
        throw new Error(
          `Couldn't find selected commit in buildkite meta-data (with key '${SELECTED_COMMIT_META_KEY}').`
        );
      }

      const targetCommitData = (
        await octokit.repos.getCommit({
          owner: 'elastic',
          repo: 'kibana',
          ref: selectedCommit,
        })
      ).data;

      await sendReleaseSlackAnnouncement({
        targetCommitData,
        currentCommitSha,
        deployTag,
      });
    },
    display: false,
  },
  error_generic: {
    name: 'Encountered an error',
    description: 'An error occurred during the release process.',
    instruction: `<h4>Please check the build logs for more information.</h4>`,
    instructionStyle: 'error',
    display: false,
  },
};

/**
 * This module is a central interface for updating the messaging interface for the wizard.
 * It's implemented as a state machine that updates the wizard state as we transition between states.
 * Use: `node <dir>/release_wizard_messaging.ts --state <state_name> [--data <data>]`
 */
export async function main(args: string[]) {
  if (!args.includes('--state')) {
    throw new Error('Missing --state argument');
  }
  const targetState = args.slice(args.indexOf('--state') + 1)[0] as StateNames;

  let data: any;
  if (args.includes('--data')) {
    data = args.slice(args.indexOf('--data') + 1)[0];
  }

  const resultingTargetState = await transition(targetState, data);
  if (resultingTargetState === 'trigger_gpctl') {
    return await transition('end');
  } else {
    return resultingTargetState;
  }
}

export async function transition(targetStateName: StateNames, data?: any) {
  // use the buildkite agent to find what state we are in:
  const currentStateName = (buildkite.getMetadata('release_state') || 'start') as StateNames;
  const stateData = JSON.parse(buildkite.getMetadata('state_data') || '{}');

  if (!currentStateName) {
    throw new Error('Could not find current state in buildkite meta-data');
  }

  // find the index of the current state in the core flow
  const currentStateIndex = Object.keys(states).indexOf(currentStateName);
  const targetStateIndex = Object.keys(states).indexOf(targetStateName);

  if (currentStateIndex === -1) {
    throw new Error(`Could not find current state '${currentStateName}' in core flow`);
  }
  const currentState = states[currentStateName];

  if (targetStateIndex === -1) {
    throw new Error(`Could not find target state '${targetStateName}' in core flow`);
  }
  const targetState = states[targetStateName];

  if (currentStateIndex + 1 !== targetStateIndex) {
    await tryCall(currentState.post, stateData);
    stateData[currentStateName] = 'nok';
  } else {
    const result = await tryCall(currentState.post, stateData);
    stateData[currentStateName] = result ? 'ok' : 'nok';
  }
  stateData[targetStateName] = 'pending';

  await tryCall(targetState.pre, stateData);

  buildkite.setMetadata('release_state', targetStateName);
  buildkite.setMetadata('state_data', JSON.stringify(stateData));

  updateWizardState(stateData);
  updateWizardInstruction(targetStateName, stateData);

  return targetStateName;
}

function updateWizardState(stateData: Record<string, 'ok' | 'nok' | 'pending' | undefined>) {
  const wizardHeader = IS_AUTOMATED_RUN
    ? `<h3>:kibana: Kibana Serverless automated promotion :robot_face:</h3>`
    : `<h3>:kibana: Kibana Serverless deployment wizard :mage:</h3>`;

  const wizardSteps = Object.keys(states)
    .filter((stateName) => states[stateName as StateNames].display)
    .filter((stateName) => !(IS_AUTOMATED_RUN && states[stateName as StateNames].skipWhenAutomated))
    .map((stateName) => {
      const stateInfo = states[stateName as StateNames];
      const stateStatus = stateData[stateName];
      const stateEmoji = {
        ok: ':white_check_mark:',
        nok: ':x:',
        pending: ':hourglass_flowing_sand:',
        missing: ':white_circle:',
      }[stateStatus || 'missing'];

      if (stateStatus === 'pending') {
        return `<div>[${stateEmoji}] ${stateInfo.name}<br />&nbsp; - ${stateInfo.description}</div>`;
      } else {
        return `<div>[${stateEmoji}] ${stateInfo.name}</div>`;
      }
    });

  const wizardHtml = `<section>
${wizardHeader}
${wizardSteps.join('\n')}
</section>`;

  buildkite.setAnnotation(WIZARD_CTX_DEFAULT, 'info', wizardHtml);
}

function updateWizardInstruction(targetState: string, stateData: any) {
  const { instructionStyle, instruction } = states[targetState as StateNames];

  if (IS_AUTOMATED_RUN) {
    buildkite.setAnnotation(
      WIZARD_CTX_INSTRUCTION,
      'info',
      `<i>It's an automated run, no action needed.</i>`
    );
  } else if (instruction) {
    buildkite.setAnnotation(
      WIZARD_CTX_INSTRUCTION,
      instructionStyle || 'info',
      `<strong>${instruction}</strong>`
    );
  }
}

async function tryCall(fn: any, ...args: any[]) {
  if (typeof fn === 'function') {
    try {
      const result = await fn(...args);
      return result !== false;
    } catch (error) {
      console.error(error);
      return false;
    }
  } else {
    return true;
  }
}

async function sendReleaseSlackAnnouncement({
  targetCommitData,
  currentCommitSha,
  deployTag,
}: {
  targetCommitData: GithubCommitType;
  currentCommitSha: string | undefined | null;
  deployTag: string;
}) {
  const textBlock = (...str: string[]) => ({ type: 'mrkdwn', text: str.join('\n') });
  const buildShortname = `kibana-serverless-release #${process.env.BUILDKITE_BUILD_NUMBER}`;

  const mergedAtDate = targetCommitData.commit?.committer?.date;
  const mergedAtUtcString = mergedAtDate ? new Date(mergedAtDate).toUTCString() : 'unknown';
  const targetCommitSha = targetCommitData.sha;
  const targetCommitShort = targetCommitSha.slice(0, 12);
  const compareResponse = (
    await octokit.repos.compareCommits({
      owner: 'elastic',
      repo: 'kibana',
      base: currentCommitSha || 'main',
      head: targetCommitSha,
    })
  ).data;
  const compareLink = currentCommitSha
    ? `<${compareResponse.html_url}|${compareResponse.total_commits} new commits>`
    : 'a new commit';

  const mainMessage = [
    `:ship_it_parrot: Promotion of ${compareLink} to QA has been <${process.env.BUILDKITE_BUILD_URL}|initiated>!\n`,
    `*Remember:* Promotion to Staging is currently a manual process and will proceed once the build is signed off in QA.\n`,
    `cc: @kibana-serverless-promotion-notify`,
  ];

  const linksSection = {
    'Initiated by': process.env.BUILDKITE_BUILD_CREATOR || 'unknown',
    'Pre-release job': `<${process.env.BUILDKITE_BUILD_URL}|${buildShortname}>`,
    'Git tag': `<https://github.com/elastic/kibana/releases/tag/${deployTag}|${deployTag}>`,
    Commit: `<https://github.com/elastic/kibana/commit/${targetCommitShort}|${targetCommitShort}>`,
    'Merged at': mergedAtUtcString,
  };

  const usefulLinksSection = getUsefulLinks({
    previousCommitHash: currentCommitSha || 'main',
    selectedCommitHash: targetCommitSha,
  });

  return sendSlackMessage({
    blocks: [
      {
        type: 'section',
        text: textBlock(...mainMessage),
      },
      {
        type: 'section',
        fields: Object.entries(linksSection).map(([name, link]) => textBlock(`*${name}*:`, link)),
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            '*Useful links:*\n\n' +
            Object.entries(usefulLinksSection)
              .filter(([name]) => !name.includes('GPCTL'))
              .map(([name, link]) => ` • <${link}|${name}>`)
              .join('\n'),
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            '*GPCTL Dashboards:*\n\n' +
            Object.entries(usefulLinksSection)
              .filter(([name]) => name.includes('GPCTL'))
              .map(([name, link]) => ` • <${link}|${name}>`)
              .join('\n'),
        },
      },
    ],
  });
}

main(process.argv.slice(2)).then(
  (targetState) => {
    console.log('Transition completed to: ' + targetState);
  },
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
