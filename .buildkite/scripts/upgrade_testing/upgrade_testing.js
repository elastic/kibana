/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const omit = require('lodash/omit');
const execa = require('execa');
const reduce = require('lodash/reduce');
const find = require('lodash/find');
const pRetry = require('p-retry');
const axios = require('axios');
const getConfig = require('./upgrade_testing_config');

const CLOUD_API_KEY = process.env.CLOUD_API_KEY_SECRET;

const request = axios.create({
  baseURL: 'https://staging.found.no/api/v1/',
  timeout: 10000,
  headers: { Authorization: `ApiKey ${CLOUD_API_KEY}` },
});

const createInstance = async () => {
  console.log('CLOUD_API_KEY', CLOUD_API_KEY);

  let response;
  try {
    response = await request.post('deployments?validate_only=false', getConfig('7.15.0'));
  } catch (error) {
    console.log('error', error);
    throw error;
    // throw new pRetry.AbortError(error);
  }


  if (response.status === 404) {
    throw new pRetry.AbortError(response.statusText);
  }

  return response;
};

const isInstanceReady = async ({ deploymentId }) => {
  console.log('isInstanceReady');

  const clusterInfo = await request.get(`/deployments/${deploymentId}`);

  // console.log('clusterInfo', clusterInfo.data);

  if (!clusterInfo.data?.healthy) {
    throw new Error('Instance not ready yet');
  }

  return clusterInfo.data;
};

const upgradeInstance = async ({ deploymentId }) => {
  console.log('upgradeInstance');
  const clusterInfo = await isInstanceReady({ deploymentId });


  const newConfig = {
    prune_orphans: false,
    resources: reduce(
      clusterInfo.resources,
      (acc, resource, key) => {
        if (!resource.length) {
          acc[key] = resource;
          return acc;
        }

        // return value
        acc[key] = resource.map((resourceItem) => ({
          ...omit(resourceItem, ['info']),
          plan: {
            ...resourceItem.info.plan_info.current.plan,
            [key]: {
              ...resourceItem.info.plan_info.current.plan[key],
              version: '7.16.0',
            },
          },
        }));
        return acc;
      },
      {}
    ),
  };

  const response = await request.put(`deployments/${deploymentId}?validate_only=false`, newConfig);

  await new Promise((r) => setTimeout(r, 30000));

  await pRetry(() => isInstanceReady({ deploymentId }), {
    retries: 10,
    minTimeout: 30 * 1000,
  });

  console.log('isREADY!');

  return response;
};

const deleteInstance = async (deploymentId) => {
  let response;
  try {
    response = await request.post(`deployments/${deploymentId}/_shutdown`);
  } catch (error) {
    console.log('error', error);
    throw error;
    // throw new pRetry.AbortError(error);
  }

  return response;
};

(async () => {
  const instance = await createInstance();
  console.log('instance', instance.data);
  const deploymentId = instance.data.id;
  const credentials = find(instance.data.resources, { kind: 'elasticsearch' }).credentials;

  console.log('credentials', credentials);

  const clusterInfo = await pRetry(() => isInstanceReady({ deploymentId }), {
    retries: 10,
    minTimeout: 30 * 1000,
  });

  const resources = {
    elasticsearch: clusterInfo.resources.elasticsearch[0].info.metadata.endpoint,
    kibana: clusterInfo.resources.kibana[0].info.metadata.endpoint,
  };

  const baseCommand = `CYPRESS_BASE_URL=https://${credentials.username}:${credentials.password}@${resources.kibana}:9243 CYPRESS_ELASTICSEARCH_URL=https://${credentials.username}:${credentials.password}@${resources.elasticsearch}:9243 CYPRESS_ELASTICSEARCH_USERNAME=${credentials.username} CYPRESS_ELASTICSEARCH_PASSWORD=${credentials.password} yarn --cwd x-pack/plugins/osquery cypress:run`;

  console.log('command', baseCommand);

  try {
    await execa.command(
      `${baseCommand} --spec cypress/integration/trusted_apps_pre.spec.ts`,
      {
        shell: true,
      }
    );
  } catch (error) {
    console.error('error', error)
    await execa.command(
      `buildkite-agent artifact upload target/kibana-osquery/**/*`
    );

    await deleteInstance(deploymentId);
  }

  await upgradeInstance({ deploymentId });

  await pRetry(() => isInstanceReady({ deploymentId }), {
    retries: 10,
    minTimeout: 30 * 1000,
  });

  try {
    await execa.command(
      `${baseCommand} --spec cypress/integration/trusted_apps_post.spec.ts`,
      {
        shell: true,
      }
    );
  } catch (error) {
    console.error('error', error)
    await execa.command(
      `buildkite-agent artifact upload target/kibana-osquery/**/*`
    );

    await deleteInstance(deploymentId);
  }

  await deleteInstance(deploymentId);
})();
