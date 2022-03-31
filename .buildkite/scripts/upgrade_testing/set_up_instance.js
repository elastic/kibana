/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const execa = require('execa');
const deleteInstance = require('./delete_instance');

module.exports = async function (deploymentId, credentials, resources) {
  const baseCommand = `CYPRESS_BASE_URL=https://${credentials.username}:${credentials.password}@${resources.kibana}:9243 CYPRESS_ELASTICSEARCH_URL=https://${credentials.username}:${credentials.password}@${resources.elasticsearch}:9243 CYPRESS_ELASTICSEARCH_USERNAME=${credentials.username} CYPRESS_ELASTICSEARCH_PASSWORD=${credentials.password} yarn --cwd x-pack/plugins/security_solution cypress:run:cloud-upgrade`;
  console.log('command', baseCommand);
  try {
    await execa.command(
      `${baseCommand} --spec cypress/cloud_upgrade_integration/trusted_apps/trusted_apps_pre.spec.ts`,
      {
        shell: true,
      }
    );
  } catch (error) {
    console.error('error', error);
    await deleteInstance(deploymentId);
  }
  await execa.command(`buildkite-agent meta-data set "baseCommand" ${baseCommand}`, {
    shell: true,
  });
  return baseCommand;
};
