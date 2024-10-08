/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
      const regex = new RegExp(`^${regexPattern}$`);

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
  for (const [owner, files] of Object.entries(ownerFilesMap)) {
    const branchName = `changes-by-${owner}`;

    console.log(`Owner: ${owner}`);
    console.log(`Files: ${files.join(', ')} \n ----`);
    console.log(`Creating branch: ${branchName}`);

    runCommand(`git checkout -b ${branchName}`);

    const fileList = files.join(' ');
    runCommand(`git add ${fileList}`);
    runCommand(`git commit -m "Changes for ${owner}"`);

    console.log(`Pushing branch: ${branchName}`);
    runCommand(`git push -u origin ${branchName}`);

    console.log(`Creating pull request for branch: ${branchName}`);
    runCommand(
      `gh pr create --base main --head ${branchName} --title "ESLint fixes for ${owner}" --body "This PR contains ESLint fixes for files owned by ${owner}"`
    );
  }
}

function runESLint() {
  console.log(`Running ESLint on ${process.env.ROUTE_TYPE} routes...`);
  const eslintRuleFlag =
    process.env.ROUTE_TYPE === 'authorized'
      ? 'MIGRATE_DISABLED_AUTHZ=false'
      : 'MIGRATE_DISABLED_AUTHZ=true';

  try {
    runCommand(
      `${eslintRuleFlag} grep -rEl --include="*.ts" "router\.(get|post|delete|put)|router\.versioned\.(get|post|put|delete)" ./x-pack/plugins/security | xargs npx eslint --fix --rule "@kbn/eslint/no_deprecated_authz_config:error"`
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

  runCommand('git checkout main');
}

main();
