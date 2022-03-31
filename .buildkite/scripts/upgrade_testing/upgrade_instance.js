/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const omit = require('lodash/omit');
const reduce = require('lodash/reduce');
const pRetry = require('p-retry');
const axios = require('axios');

const CLOUD_API_KEY = process.env.CLOUD_API_KEY_SECRET;

const request = axios.create({
  baseURL: 'https://staging.found.no/api/v1/',
  timeout: 10000,
  headers: { Authorization: `ApiKey ${CLOUD_API_KEY}` },
});

const isInstanceReady = async ({ deploymentId }) => {
  console.log('Waiting for instance to be upgraded');

  const clusterInfo = await request.get(`/deployments/${deploymentId}`);

  if (!clusterInfo.data?.healthy) {
    throw new Error('Instance not ready yet');
  }

  return clusterInfo.data;
};

const upgradeInstance = async ({ deploymentId, version }) => {
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
          ...omit(resourceItem, ['id', 'info']),
          plan: {
            ...resourceItem.info.plan_info.current.plan,
            [key]: {
              ...resourceItem.info.plan_info.current.plan[key],
              version,
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

  console.log('Instance has been upgraded successfully');

  return response;
};

module.exports = async function (deploymentId, version) {
  await upgradeInstance({ deploymentId, version });

  await pRetry(() => isInstanceReady({ deploymentId }), {
    retries: 10,
    minTimeout: 30 * 1000,
  });
};
