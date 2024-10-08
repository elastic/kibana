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

process.env.ROUTE_TYPE = 'unauthorized';
const DRY_RUN = process.env.DRY_RUN === 'true' || true;

const PR_DESCRIPTION_TEXT = `
### ESLint Fixes for Access Tag Migration

This PR migrates \`access:<privilege>\` tags used in route definitions.

### **Before Migration:**
Access control tags were defined in the \`options\` object of the route, using the \`access:<privilege>\` pattern:

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
After the migration, these tags have been replaced with the more robust \`security.authz.requiredPrivileges\` field under \`security\`:

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
`;

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (err) {
    console.error(`Error running command: ${command}`);
    console.error(err.stdout.toString());
    process.exit(1);
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
  const currentBranch = runCommand('git rev-parse --abbrev-ref HEAD');
  console.log(`Current branch (PR branch): ${currentBranch}`);

  console.log(`Fetching the latest changes from 'main'`);
  runCommand('git fetch origin main');

  for (const [owner, files] of Object.entries(ownerFilesMap)) {
    const tempBranch = `temp/eslint-changes-by-${owner.replace('@elastic/', '')}`;

    console.log(`Creating temporary branch for owner ${owner}: ${tempBranch}`);

    runCommand(`git checkout -b ${tempBranch}`);

    const fileList = files.join(' ');
    runCommand(`git add ${fileList}`);
    runCommand(`git commit -m "ESLint changes for ${owner}"`);

    console.log(`Temporary branch ${tempBranch} created and committed changes for ${owner}`);
  }

  for (const [owner] of Object.entries(ownerFilesMap)) {
    const tempBranch = `temp/eslint-changes-by-${owner.replace('@elastic/', '')}`;
    const targetBranch = `eslint/changes-by-${owner.replace('@elastic/', '')}`;

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

    if (!DRY_RUN) {
      const title =
        process.env.ROUTE_TYPE === 'authorized'
          ? `Authorized Route Migration for routes owned by ${owner}`
          : `Unauthorized Route Migration for routes owned by ${owner}`;
      const labels =
        process.env.ROUTE_TYPE === 'authorized'
          ? '[Authz API migration] authorized'
          : '[Authz API migration] unauthorized';
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
          // '--repo',
          // 'elena-shostak/kibana',
          '--base',
          'main',
          '--head',
          targetBranch,
          '--title',
          title,
          '--body',
          PR_DESCRIPTION_TEXT,
        ],
        { stdio: 'inherit' }
      );
    }
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
    runCommand(
      `${eslintRuleFlag} npx eslint --ext .ts --fix --rule "@kbn/eslint/no_deprecated_authz_config:error" ./x-pack/plugins`
    );

    runCommand(
      `${eslintRuleFlag} npx eslint --ext .ts --fix --rule "@kbn/eslint/no_deprecated_authz_config:error" ./x-pack/packages`
    );

    runCommand(
      `${eslintRuleFlag} npx eslint --ext .ts --fix --rule "@kbn/eslint/no_deprecated_authz_config:error" ./src/plugins`
    );

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
