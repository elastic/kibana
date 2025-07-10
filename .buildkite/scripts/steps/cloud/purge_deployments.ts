/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { getKibanaDir } from '#pipeline-utils';

const deploymentsListJson = execSync('ecctl deployment list --output json').toString();
const { deployments } = JSON.parse(deploymentsListJson) as {
  deployments: Array<{ name: string; id: string }>;
};

const prDeployments = deployments.filter((deployment) => deployment.name.startsWith('kibana-pr-'));

const deploymentsToPurge: typeof deployments = [];

const NOW = new Date().getTime() / 1000;
const DAY_IN_SECONDS = 60 * 60 * 24;
const CLOUD_DELETE_ON_ERROR = process.env.CLOUD_DELETE_ON_ERROR?.match(/^(true|1)$/i);

for (const deployment of prDeployments) {
  try {
    const prNumber: string | undefined = deployment.name.match(/^kibana-pr-([0-9]+)$/)?.[1];
    if (!prNumber) {
      throw new Error(
        `Invalid deployment name: ${deployment.name}; expected kibana-pr-{PR_NUMBER}).`
      );
    }

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
    console.error(`Error deleting deployment (${deployment.id}; ${deployment.name})`);
    console.error(ex.toString());
    if (CLOUD_DELETE_ON_ERROR) {
      deploymentsToPurge.push(deployment);
    } else {
      process.exitCode = 1;
    }
  }
}

for (const deployment of deploymentsToPurge) {
  console.log(`Scheduling deployment for deletion: ${deployment.name} / ${deployment.id}`);
  try {
    execSync(`ecctl deployment shutdown --force '${deployment.id}'`, { stdio: 'inherit' });

    execSync(`.buildkite/scripts/common/deployment_credentials.sh unset ${deployment.name}`, {
      cwd: getKibanaDir(),
      stdio: 'inherit',
    });
  } catch (ex) {
    console.error(ex.toString());
    process.exitCode = 1;
  }
}
