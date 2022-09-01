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

const prNumber = parseInt(
  process.env.KIBANA_PULL_REQUEST ||
    execSync('buildkite-agent meta-data get kibana-pull-request').toString(),
  10
);
const deploymentName = `kibana-pr-${prNumber}`;
const deployment = deployments.find((d: any) => d.name === deploymentName);

if (!prNumber || !deployment) {
  console.error(`${deploymentName} not found`);
  process.exit(1);
}

console.log(`Scheduling deployment for deletion: ${deployment.name} / ${deployment.id}`);
try {
  execSync(`ecctl deployment shutdown --force '${deployment.id}'`, { stdio: 'inherit' });
  execSync(`vault delete secret/kibana-issues/dev/cloud-deploy/${deployment.name}`, {
    stdio: 'inherit',
  });
} catch (ex) {
  console.error(ex.toString());
}
