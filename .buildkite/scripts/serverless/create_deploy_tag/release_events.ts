/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildkite } from './shared';

/**
 * For debugging
 */
export function getBuildkiteClient() {
  return buildkite;
}

/**
 * We'd like to define the release steps, and define the pre-post actions for transitions.
 * For this we can create a basic state machine, and define the transitions.
 */

const WIZARD_CTX_INSTRUCTION = 'wizard-instruction';
const WIZARD_CTX_DEFAULT = 'wizard-main';

type StateShape = any;
type StateNames =
  | 'start'
  | 'initialize'
  | 'collect_commits'
  | 'wait_for_selection'
  | 'collect_commit_info'
  | 'wait_for_confirmation'
  | 'create_deploy_tag'
  | 'tag_created'
  | 'end'
  | 'error_generic'
  | string;

const states: Record<
  StateNames,
  {
    name: string;
    description: string;
    instruction?: string;
    instructionStyle?: 'success' | 'warning' | 'error' | 'info';
    display: boolean;
    pre?: (state: StateShape) => Promise<void | boolean>;
    post?: (state: StateShape) => Promise<void | boolean>;
  }
> = {
  start: {
    name: 'Starting state',
    description: 'No description',
    display: false,
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
    description: 'Waiting for the Release Manager to select a release candidate commit.',
    instruction: `Please select a commit candidate for release.`,
    instructionStyle: 'warning',
    display: true,
  },
  collect_commit_info: {
    name: 'Collecting commit info',
    description: 'Collecting supplementary info about the selected commit.',
    instruction: `Please wait, while we're collecting data about the commit, and the release candidate.`,
    instructionStyle: 'info',
    display: true,
  },
  wait_for_confirmation: {
    name: 'Waiting for confirmation',
    description: 'Waiting for the Release Manager to confirm the release.',
    instruction: `Please review the collected information above and unblock the release on Buildkite, if you're satisfied.`,
    instructionStyle: 'warning',
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
    post: async () => {
      const deployTag = buildkite.getMetadata('deploy-tag');
      buildkite.setAnnotation(
        WIZARD_CTX_INSTRUCTION,
        'success',
        `<h3>Deploy tag successfully created!</h3>
<br/>
Your deployment will appear <a href='https://buildkite.com/elastic/kibana-serverless-release/builds?branch=${deployTag}'>here on buildkite.</a>`
      );
    },
    instructionStyle: 'success',
    display: true,
  },
  end: {
    name: 'End of the release process',
    description: 'The release process has ended.',
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

export async function transition(targetStateName: StateNames, data?: any) {
  // use the buildkite agent to find what state we are in:
  const currentStateName = buildkite.getMetadata('release_state') || 'start';
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
    // TODO: it's an out-of-order transition, we need to handle this
    stateData[currentStateName] = 'nok';
  } else {
    const result = await tryCall(currentState.post, stateData);
    stateData[currentStateName] = result ? 'ok' : 'nok';
  }
  stateData[targetStateName] = 'pending';

  // TODO: what if  this fails?
  await tryCall(targetState.pre, stateData);

  buildkite.setMetadata('release_state', targetStateName);
  buildkite.setMetadata('state_data', JSON.stringify(stateData));

  updateWizardState(stateData);
  updateWizardInstruction(targetStateName, stateData);

  return targetStateName;
}

function updateWizardState(stateData: Record<string, 'ok' | 'nok' | 'pending' | undefined>) {
  const wizardHeader = `<h3>:kibana: Kibana Serverless deployment wizard :mage:</h3>`;

  const wizardSteps = Object.keys(states)
    .filter((stateName) => states[stateName].display)
    .map((stateName) => {
      const stateInfo = states[stateName];
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
  const { instructionStyle, instruction } = states[targetState];

  if (instruction) {
    buildkite.setAnnotation(WIZARD_CTX_INSTRUCTION, instructionStyle || 'info', instruction);
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

/**
 * Entrypoint for the CLI
 */
export async function main(args: string[]) {
  if (!args.includes('--state')) {
    throw new Error('Missing --state argument');
  }
  const targetState = args.slice(args.indexOf('--state') + 1)[0];

  let data: any;
  if (args.includes('--data')) {
    data = args.slice(args.indexOf('--data') + 1)[0];
  }

  const resultingTargetState = await transition(targetState, data);
  if (resultingTargetState === 'tag_created') {
    return await transition('end');
  } else {
    return resultingTargetState;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  main(args).then(
    (targetState) => {
      console.log('Transition completed to: ' + targetState);
    },
    (error) => {
      console.error(error);
      process.exit(1);
    }
  );
}
