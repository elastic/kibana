/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

require('../src/setup_node_env');

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getCodeOwnersForFile, getPathsWithOwnersReversed } = require('@kbn/code-owners');

const DRY_RUN = process.env.DRY_RUN === 'true';

console.log('DRY_RUN:', DRY_RUN);

const teamLabels = {
  '@elastic/kibana-core': 'Team:Core',
  '@elastic/appex-ai-infra': 'Team:AI Infra',
  '@elastic/kibana-alerting-services': 'Team:Alerting Services',
  '@elastic/kibana-operations': 'Team:Operations',
  '@elastic/kibana-security': 'Team:Security',
  '@elastic/kibana-reporting-services': 'Team:Reporting Services',
  '@elastic/kibana-visualizations': 'Team:Visualizations',
  '@elastic/kibana-data-discovery': 'Team:DataDiscovery',
  '@elastic/kibana-gis': 'Team:Geo',
  '@elastic/kibana-presentation': 'Team:Presentation',
  '@elastic/appex-sharedux': 'Team:SharedUX',
  '@elastic/kibana-qa': 'Team:QA',
  '@elastic/kibana-localization': 'Project:i18n',
  '@elastic/kibana-design': 'Team:Design',
  '@elastic/ml-ui': ':ml',
  '@elastic/ingest-management': 'Team:Logstash',
  '@elastic/beats': 'Beats',
  '@elastic/security-solution': 'Team: SecuritySolution',
  '@elastic/security-generative-ai': 'Team:Security Generative AI',
  '@elastic/security-entity-analytics': 'Team:Entity Analytics',
  '@elastic/security-detection-engine': 'Team:Detection Engine',
  '@elastic/security-detection-rule-management': 'Team:Detection Rule Management',
  '@elastic/security-threat-hunting': 'Team:Threat Hunting',
  '@elastic/security-threat-hunting-explore': 'Team:Threat Hunting:Explore',
  '@elastic/security-threat-hunting-investigations': 'Team:Threat Hunting:Investigations',
  '@elastic/security-defend-workflows': 'Team:Defend Workflows',
  '@elastic/kibana-cloud-security-posture': 'Team:Cloud Security',
  '@elastic/kibana-management': 'Team:Kibana Management',
  '@elastic/response-ops': 'Team:ResponseOps',
  '@elastic/obs-knowledge-team': 'Team:obs-knowledge',
  '@elastic/obs-ux-infra_services-team': 'Team:obs-ux-infra_services',
  '@elastic/obs-ux-logs-team': 'Team:obs-ux-logs',
  '@elastic/obs-ux-management-team': 'Team:obs-ux-management',
  '@elastic/kibana-core-ui': 'Team:Core UI',
  '@elastic/kibana-app-arch': 'Team:AppArch',
  '@elastic/kibana-app': 'Team:KibanaApp',
  '@elastic/kibana-platform': 'Team:Platform',
  '@elastic/es-ui': 'Team:Elasticsearch UI',
  '@elastic/fleet': 'Team:Fleet',
  '@elastic/kibana-esql': 'Team:ESQL',
  '@elastic/security-scalability': 'Team:Security-Scalability',
  '@elastic/obs-ai-assistant': 'Team:Obs AI Assistant',
  '@elastic/search-kibana': 'Team:Search',
  '@elastic/logstash': 'Team:Logstash',
  '@elastic/stack-monitoring': 'Team:Monitoring',
  '@elastic/security-service-integrations': 'Team:Security-Scalability',
};

const PR_DESCRIPTION_TEXT = `
### Updating Testing Library Migration 

This PR migrates test suites that use \renderHook\` from the library \`@testing-library/react-hooks\` to adopt the equivalent and replacement of \`renderHook\` from the export that is now available from
\`@testing-library/react\`. This work is required for the planned migration to react18. 

## Summary

In this PR, usages of \`waitForNextUpdate\` that previously could have been destructured from \`renderHook\` are now been replaced with \`waitFor\` exported from \`@testing-library/react\`, furthermore \`waitFor\` 
that would also have been destructured from the same renderHook result is now been replaced with waitFor from the export of \`@testing-library/react\`.


***Why is \`waitFor\` a sufficient enough replacement for \`waitForNextUpdate\`, and better for testing values subject to async computations?***

WaitFor will retry the provided callback if an error is returned, till the configured timeout elapses. By default the retry interval is \`50ms\` with a timeout value of \`1000ms\` that 
effectively translates to at least 20 retries for assertions placed within waitFor. See https://testing-library.com/docs/dom-testing-library/api-async/#waitfor for more information.
This however means that for person's writing tests, said person has to be explicit about expectations that describe the internal state of the hook being tested. 
This implies checking for instance when a react query hook is being rendered, there's an assertion that said hook isn't loading anymore.

In this PR you'd notice that this pattern has been adopted, with most existing assertions following an invocation of \`waitForNextUpdate\` being placed within a \`waitFor\` 
invocation. In some cases the replacement is simply a \`waitFor(() => new Promise((resolve) => resolve(null)))\` (many thanks to @kapral18, for point out exactly why this works),
 where this suffices the assertions that follow aren't placed within a waitFor so this PR doesn't get larger than it needs to be.

### What to do next?
1. Review the changes in this PR.
2. If you think the changes are correct, approve the PR.

## Any questions?
If you have any questions or need help with this PR, please leave comments in this PR.
`;

function runCommand(command, silent = false) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (err) {
    if (!silent) {
      console.error(`Error running command: ${command}`);
      console.error(err.stdout.toString());
      process.exit(1);
    } else {
      console.warn(`Error running command: ${command}`);
      console.warn(err.stdout.toString());
    }
  }
}

function getChangedFiles() {
  const diffOutput = runCommand(
    'git diff --name-only --diff-filter=M 68909a866442e7b212434acc6e7bb9777dec5173..62082b2857cbe1c72132d75eebe5badc3ca95083'
  );
  return diffOutput.split('\n').filter(Boolean);
}

function groupFilesByOwners(files) {
  const ownerFilesMap = {};
  const reversedCodeowners = getPathsWithOwnersReversed();

  files.forEach((file) => {
    let owner = getCodeOwnersForFile(file, reversedCodeowners)?.replaceAll('elastic/', '');

    if (owner) {
      if (!ownerFilesMap[owner]) ownerFilesMap[owner] = [];
      ownerFilesMap[owner].push(file);
    }
  });

  return ownerFilesMap;
}

// Create a branch, stage, and commit files for each owner
function processChangesByOwners(ownerFilesMap) {
  try {
    const currentBranch = runCommand('git rev-parse --abbrev-ref HEAD');
    console.log(`Current branch (PR branch): ${currentBranch}`);

    runCommand(`git fetch upstream`);
    runCommand(`git checkout main`);
    runCommand(`git rebase upstream/main`);
    runCommand(`yarn kbn bootstrap`);

    for (const [owner, files] of Object.entries(ownerFilesMap)) {
      const rawOwner = owner.replaceAll(',', '_');
      const targetBranch = `chore/testing-library-migration-for-${rawOwner}`;

      console.log(`Creating branch for owner ${owner}: ${targetBranch}`);

      runCommand(`git checkout -b ${targetBranch} main`);

      const fileList = files.join(' ');
      runCommand(`git checkout ${currentBranch} -- ${fileList}`);
      runCommand(`git status`);
      runCommand(`git add .`);
      runCommand(
        `git commit -m "[React18] Migrated test suites to accommodate changes to testing library owned by ${owner}"`
      );

      console.log(`Branch ${targetBranch} created and committed changes for ${owner}`);
      //   runCommand(`git checkout ${currentBranch}`);

      if (!DRY_RUN) {
        const title = `[React18] Migrate test suites to account for testing library upgrades ${owner}`;
        const prLabel = 'React@18';
        const teamLabel = owner
          .split(',')
          .map((o) => teamLabels[`@elastic/${o}`])
          .filter((o) => o !== undefined);
        console.log(`Pushing the new branch: ${targetBranch} to remote`);
        runCommand(`git push origin ${targetBranch}`);

        const labels = [prLabel, 'release_note:skip', 'backport:prev-minor'];

        if (teamLabel.length) {
          labels.push(...teamLabel);
        }

        console.log(`Creating pull request for branch: ${targetBranch}`);
        execFileSync(
          'gh',
          [
            'pr',
            'create',
            '--base',
            'main',
            // '--head',
            // targetBranch,
            '--title',
            title,
            '--body',
            PR_DESCRIPTION_TEXT,
            '--label',
            labels.join(','),
            '--draft',
            '--repo',
            'elastic/kibana',
            '--assignee',
            '@me',
          ],
          { stdio: 'inherit' }
        );
      }
    }
    console.log('Created the following branches:');
    console.log(
      runCommand("git branch | sed 's/^[ *]*//' | grep -E '^chore/testing-library-migration'")
    );
    runCommand(`git checkout main`);
  } catch (error) {
    console.error('Error processing changes:', error);
  } finally {
    console.log('Deleting any created branches:');
    runCommand(
      "git branch | sed 's/^[ *]*//' | grep -E '^chore/testing-library-migration' | xargs -r git branch -D"
    );
  }
}

function main() {
  const codeownersPath = path.resolve('.github', 'CODEOWNERS');
  if (!fs.existsSync(codeownersPath)) {
    console.error('CODEOWNERS file not found');
    process.exit(1);
  }

  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log('No changes detected.');
    return;
  }

  const ownerFilesMap = groupFilesByOwners(changedFiles);

  processChangesByOwners(ownerFilesMap);
}

main();
