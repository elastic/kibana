/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

process.env.ROUTE_TYPE = 'authorized';
const DRY_RUN = process.env.DRY_RUN === 'true';

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
  '@elastic/ingest-management': 'logstash',
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
};

const PR_DESCRIPTION_TEXT_AUTHORIZED = `
### Authz API migration for authorized routes

This PR migrates \`access:<privilege>\` tags used in route definitions to new security configuration.
Please refer to the documentation for more information: [Authorization API](https://docs.elastic.dev/kibana-dev-docs/key-concepts/security-api-authorization)

### **Before Migration:**
Access control tags were defined in the \`options\` object of the route:

\`\`\`ts
router.get({
  path: '/api/path',
  options: {
    tags: ['access:<privilege_1>', 'access:<privilege_2>'],
  },
  ...
}, handler);
\`\`\`

### **After Migration:**
Tags have been replaced with the more robust \`security.authz.requiredPrivileges\` field under \`security\`:

\`\`\`ts
router.get({
  path: '/api/path',
  security: {
    authz: {
      requiredPrivileges: ['<privilege_1>', '<privilege_2>'],
    },
  },
  ...
}, handler);
\`\`\`

### What to do next?
1. Review the changes in this PR.
2. You might need to update your tests to reflect the new security configuration:
  - If you have tests that rely on checking \`access\` tags.
  - If you have snapshot tests that include the route definition.
  - If you have FTR tests that rely on checking unauthorized error message. The error message changed to also include missing privileges.

## Any questions?
If you have any questions or need help with API authorization, please reach out to the \`@elastic/kibana-security\` team.
`;

const PR_DESCRIPTION_TEXT_UNAUTHORIZED = `
### Authz API migration for unauthorized routes

This PR migrates unauthorized routes owned by your team to a new security configuration.
Please refer to the documentation for more information: [Authorization API](https://docs.elastic.dev/kibana-dev-docs/key-concepts/security-api-authorization)

### **Before Migration:**
\`\`\`ts
router.get({
  path: '/api/path',
  ...
}, handler);
\`\`\`

### **After Migration:**
\`\`\`ts
router.get({
  path: '/api/path',
  security: {
    authz: {
      enabled: false,
      reason: 'This route is opted out from authorization because ...',
    },
  },
  ...
}, handler);
\`\`\`

### What to do next?
1. Review the changes in this PR.
2. Elaborate on the reasoning to opt-out of authorization.
3. Routes without a compelling reason to opt-out of authorization should plan to introduce them as soon as possible.
2. You might need to update your tests to reflect the new security configuration:
  - If you have snapshot tests that include the route definition.

## Any questions?
If you have any questions or need help with API authorization, please reach out to the \`@elastic/kibana-security\` team.
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

function parseCodeOwners(codeownersPath) {
  const codeowners = {};
  const content = fs.readFileSync(codeownersPath, 'utf8').split('\n');

  content.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [pattern, owner] = trimmed.split(/\s+/);
    if (pattern && owner) {
      codeowners[pattern] = owner;
    }
  });

  return codeowners;
}

function getChangedFiles() {
  const diffOutput = runCommand('git diff --name-only --diff-filter=M');
  return diffOutput.split('\n').filter(Boolean);
}

function groupFilesByOwners(files, codeowners) {
  const ownerFilesMap = {};

  files.forEach((file) => {
    for (const [pattern, owner] of Object.entries(codeowners)) {
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\//g, '\\/');

      const regex = new RegExp(`${regexPattern}`);

      if (regex.test(file)) {
        if (!ownerFilesMap[owner]) ownerFilesMap[owner] = [];
        ownerFilesMap[owner].push(file);
        break;
      }
    }
  });

  return ownerFilesMap;
}

// Create a branch, stage, and commit files for each owner
function processChangesByOwners(ownerFilesMap) {
  try {
    const currentBranch = runCommand('git rev-parse --abbrev-ref HEAD');
    console.log(`Current branch (PR branch): ${currentBranch}`);

    console.log(`Fetching the latest changes from 'main'`);
    runCommand('git fetch origin main');

    for (const [owner, files] of Object.entries(ownerFilesMap)) {
      const rawOwner = owner.replace('@elastic/', '');
      const tempBranch = `temp/${process.env.ROUTE_TYPE}-eslint-changes-by-${rawOwner}`;

      console.log(`Creating temporary branch for owner ${owner}: ${tempBranch}`);

      runCommand(`git checkout -b ${tempBranch}`);

      const fileList = files.join(' ');
      runCommand(`git add ${fileList}`);
      runCommand(`git commit -m "[Authz] ESLint changes for ${owner}"`);

      console.log(`Temporary branch ${tempBranch} created and committed changes for ${owner}`);
    }

    for (const [owner] of Object.entries(ownerFilesMap)) {
      const rawOwner = owner.replace('@elastic/', '');
      const tempBranch = `temp/${process.env.ROUTE_TYPE}-eslint-changes-by-${rawOwner}`;
      const targetBranch = `eslint/${process.env.ROUTE_TYPE}-changes-by-${rawOwner}`;

      console.log(`Checking out 'main' branch`);
      runCommand(`git checkout main`);

      console.log(`Creating target branch for owner ${owner}: ${targetBranch}`);
      runCommand(`git checkout -b ${targetBranch}`);

      console.log(`Cherry-picking changes from ${tempBranch} into ${targetBranch}`);
      try {
        runCommand(`git cherry-pick ${tempBranch}`);
      } catch (error) {
        console.error(
          `Cherry-pick conflict! Please resolve conflicts manually for branch ${targetBranch}.`
        );
        return;
      }

      console.log('Created the following branches:');
      console.log(runCommand("git branch | sed 's/^[ *]*//' | grep -E '^(temp|eslint)'"));

      if (!DRY_RUN) {
        const title =
          process.env.ROUTE_TYPE === 'authorized'
            ? `Authorized Route Migration for routes owned by ${owner}`
            : `Unauthorized Route Migration for routes owned by ${owner}`;
        const labels =
          process.env.ROUTE_TYPE === 'authorized'
            ? '[Authz API migration] authorized'
            : '[Authz API migration] unauthorized';
        const teamLabel = teamLabels[owner];
        console.log(`Pushing the new branch: ${targetBranch} to remote`);
        runCommand(`git push origin ${targetBranch}`);

        console.log(`Deleting temporary branch: ${tempBranch}`);
        runCommand(`git branch -D ${tempBranch}`);

        console.log(`Creating pull request for branch: ${targetBranch}`);
        // For some reason, running it in shell executes the markdown and fails
        execFileSync(
          'gh',
          [
            'pr',
            'create',
            '--repo',
            'elena-shostak/kibana',
            '--base',
            'main',
            '--head',
            targetBranch,
            '--title',
            title,
            '--body',
            process.env.ROUTE_TYPE === 'authorized'
              ? PR_DESCRIPTION_TEXT_AUTHORIZED
              : PR_DESCRIPTION_TEXT_UNAUTHORIZED,
          ],
          { stdio: 'inherit' }
        );
      }
    }
  } catch (error) {
    console.error('Error processing changes:', error);
    console.log('Deleting any created branches:');
    runCommand("git branch | sed 's/^[ *]*//' | grep -E '^(temp|eslint)' | xargs -r git branch -D");
  }
}

function runESLint() {
  console.log(`Running ESLint on ${process.env.ROUTE_TYPE} routes...`);
  const eslintRuleFlag =
    process.env.ROUTE_TYPE === 'authorized'
      ? 'MIGRATE_DISABLED_AUTHZ=false'
      : 'MIGRATE_ENABLED_AUTHZ=false';

  try {
    // For some reason, it seems to skip some files
    // runCommand(
    //   `grep -rEl --include="*.ts" "router\.(get|post|delete|put)|router\.versioned\.(get|post|put|delete)" ./x-pack/plugins/ ./x-pack/packages/ | xargs env ${eslintRuleFlag} npx eslint --fix --rule "@kbn/eslint/no_deprecated_authz_config:error"`
    // );
    // const directories = ['./x-pack/plugins', './x-pack/packages', './src/plugins'];
    const directories = ['./x-pack/plugins/security', './x-pack/plugins/spaces']; // For testing purposes

    for (const directory of directories) {
      console.log(`Running ESLint autofix for ${directory}`);
      runCommand(`${eslintRuleFlag} npx eslint --ext .ts --fix ${directory}`, true);
    }

    console.log('ESLint autofix complete');
  } catch (error) {
    console.error('Error running ESLint:', error);
  }
}

function main() {
  const codeownersPath = path.resolve('.github', 'CODEOWNERS');
  if (!fs.existsSync(codeownersPath)) {
    console.error('CODEOWNERS file not found');
    process.exit(1);
  }

  const codeowners = parseCodeOwners(codeownersPath);

  runESLint();

  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log('No changes detected.');
    return;
  }

  const ownerFilesMap = groupFilesByOwners(changedFiles, codeowners);

  processChangesByOwners(ownerFilesMap);
}

main();
