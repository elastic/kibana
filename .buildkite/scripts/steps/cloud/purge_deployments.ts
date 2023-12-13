/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';

const deploymentsListJson = execSync('ecctl deployment list --output json').toString();
const { deployments } = JSON.parse(deploymentsListJson);
const secretBasePath = process.env.VAULT_ADDR?.match(/secrets\.elastic\.co/g)
  ? 'secret/kibana-issues/dev'
  : 'secret/ci/elastic-kibana';

const prDeployments = deployments.filter((deployment: any) =>
  deployment.name.startsWith('kibana-pr-')
);

const deploymentsToPurge = [];

const NOW = new Date().getTime() / 1000;
const DAY_IN_SECONDS = 60 * 60 * 24;

for (const deployment of prDeployments) {
  try {
    const prNumber = deployment.name.match(/^kibana-pr-([0-9]+)$/)[1];
    const prJson = execSync(`gh pr view '${prNumber}' --json state,labels,updatedAt`).toString();
    const pullRequest = JSON.parse(prJson);
    const prOpen = pullRequest.state === 'OPEN';

    const lastCommitTimestamp = new Date(pullRequest.updatedAt).getTime() / 1000;

    const persistDeployment = Boolean(
      pullRequest.labels.filter((label: any) => label.name === 'ci:cloud-persist-deployment').length
    );
    if (prOpen && persistDeployment) {
      continue;
    }

    if (!prOpen) {
      console.log(`Pull Request #${prNumber} is no longer open, will delete associated deployment`);
      deploymentsToPurge.push(deployment);
    } else if (
      !Boolean(
        pullRequest.labels.filter((label: any) =>
          /^ci:(cloud-deploy|cloud-redeploy)$/.test(label.name)
        ).length
      )
    ) {
      console.log(
        `Pull Request #${prNumber} no longer has a cloud deployment label, will delete associated deployment`
      );
      deploymentsToPurge.push(deployment);
    } else if (lastCommitTimestamp < NOW - DAY_IN_SECONDS * 2) {
      console.log(
        `Pull Request #${prNumber} has not been updated in more than 2 days, will delete associated deployment`
      );
      deploymentsToPurge.push(deployment);
    }
  } catch (ex) {
    console.error(ex.toString());
    // deploymentsToPurge.push(deployment); // TODO should we delete on error?
    process.exitCode = 1;
  }
}

for (const deployment of deploymentsToPurge) {
  console.log(`Scheduling deployment for deletion: ${deployment.name} / ${deployment.id}`);
  try {
    execSync(`ecctl deployment shutdown --force '${deployment.id}'`, { stdio: 'inherit' });
    execSync(`vault delete ${secretBasePath}/cloud-deploy/${deployment.name}`, {
      stdio: 'inherit',
    });
  } catch (ex) {
    console.error(ex.toString());
    process.exitCode = 1;
  }
}
