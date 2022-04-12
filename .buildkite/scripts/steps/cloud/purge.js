/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { execSync } = require('child_process');

const deploymentsListJson = execSync('ecctl deployment list --output json').toString();
const { deployments } = JSON.parse(deploymentsListJson);

const prDeployments = deployments.filter((deployment) => deployment.name.startsWith('kibana-pr-'));

const deploymentsToPurge = [];

const NOW = new Date().getTime() / 1000;

for (const deployment of prDeployments) {
  try {
    const prNumber = deployment.name.match(/^kibana-pr-([0-9]+)$/)[1];
    const prJson = execSync(`gh pr view '${prNumber}' --json state,labels,commits`).toString();
    const pullRequest = JSON.parse(prJson);

    const lastCommit = pullRequest.commits.slice(-1)[0];
    const lastCommitTimestamp = new Date(lastCommit.committedDate).getTime() / 1000;

    if (pullRequest.state !== 'OPEN') {
      console.log(`Pull Request #${prNumber} is no longer open, will delete associated deployment`);
      deploymentsToPurge.push(deployment);
    } else if (!pullRequest.labels.filter((label) => label.name === 'ci:deploy-cloud')) {
      console.log(
        `Pull Request #${prNumber} no longer has the ci:deploy-cloud label, will delete associated deployment`
      );
      deploymentsToPurge.push(deployment);
    } else if (lastCommitTimestamp < NOW - 60 * 60 * 24 * 7) {
      console.log(
        `Pull Request #${prNumber} has not been updated in more than 7 days, will delete associated deployment`
      );
      deploymentsToPurge.push(deployment);
    }
  } catch (ex) {
    console.error(ex.toString());
    // deploymentsToPurge.push(deployment); // TODO should we delete on error?
  }
}

for (const deployment of deploymentsToPurge) {
  console.log(`Scheduling deployment for deletion: ${deployment.name} / ${deployment.id}`);
  try {
    execSync(`ecctl deployment shutdown --force '${deployment.id}'`, { stdio: 'inherit' });
    execSync(`vault delete secret/kibana-issues/dev/cloud-deploy/${deployment.name}`, {
      stdio: 'inherit',
    });
  } catch (ex) {
    console.error(ex.toString());
  }
}
