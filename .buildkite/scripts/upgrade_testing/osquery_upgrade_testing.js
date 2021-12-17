/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { spawn } = require('child_process');

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

const createInstance = async (version = '7.16.0') => {
  console.log('CLOUD_API_KEY', CLOUD_API_KEY);

  let response;
  try {
    response = await request.post('deployments?validate_only=false', getConfig(version));
  } catch (error) {
    console.log('error', error);
    throw error;
  }


  if (response.status === 404) {
    throw new pRetry.AbortError(response.statusText);
  }

  return response;
};

const isInstanceReady = async ({ deploymentId }) => {
  console.log('checkingIfInstanceReady', deploymentId);

  const clusterInfo = await request.get(`/deployments/${deploymentId}`);

  if (!clusterInfo.data?.healthy || clusterInfo.data?.resources.kibana[0].info.status !== 'started') {
    throw new Error('Instance not ready yet');
  }

  return clusterInfo.data;
};

const upgradeInstance = async ({ deploymentId, version }) => {
  console.log('upgradesInstance', deploymentId, version );
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

  await new Promise((r) => setTimeout(r, 60000));

  await pRetry(() => isInstanceReady({ deploymentId }), {
    retries: 10,
    minTimeout: 30 * 1000,
  });

  console.log('isREADY!');

  return response;
};

const deleteInstance = async (deploymentId) => {
  console.log('deleteInstance');
  await request.post(`deployments/${deploymentId}/_shutdown`);
};

const getFleetServerHost = async (kibanaUrl) => {
  const response = await axios.get(`${kibanaUrl}/api/fleet/settings`);

  return response?.data.item.fleet_server_hosts[0]
};

const startAgentInDocker = ({ version, fleetServerHost, policyApiKey }) => {
  const args = [
    'run',
    '--env',
    'FLEET_ENROLL=1',
    '--env',
    `FLEET_URL=${fleetServerHost}`,
    '--env',
    `FLEET_ENROLLMENT_TOKEN=${policyApiKey}`,
    '--rm',
    `docker.elastic.co/beats/elastic-agent:${version}`,
  ];
  return spawn('docker', args);
}

const includeCredentialsToUrl = (url, credentials) => {
  const [prefix, endpoint] = url.split('//');

  return `${prefix}//${credentials.username}:${credentials.password}@${endpoint}`;
};

const getDefaultPolicyApiKey = async (kibanaUrl, credentials) => {
  const response = await axios.get(`${kibanaUrl}/api/fleet/enrollment-api-keys`);
  const defaultPolicy = find(response.data.list, (item) => item.policy_id !== 'policy-elastic-agent-on-cloud');

  if (!defaultPolicy) {
    throw new Error('No default policy found');
  }

  return defaultPolicy.api_key;
};

(async () => {
  const instance = await createInstance();
  const deploymentId = instance.data.id;
  const credentials = find(instance.data.resources, { kind: 'elasticsearch' }).credentials;

  console.log('credentials', credentials);

  const clusterInfo = await pRetry(() => isInstanceReady({ deploymentId }), {
    retries: 10,
    minTimeout: 30 * 1000,
  });


  const resources = {
    elasticsearch: includeCredentialsToUrl(clusterInfo.resources.elasticsearch[0].info.metadata.aliased_url, credentials),
    kibana: includeCredentialsToUrl(clusterInfo.resources.kibana[0].info.metadata.aliased_url, credentials),
  };

  const fleetServerHost = await pRetry(() => getFleetServerHost(resources.kibana), {
    retries: 10,
    minTimeout: 30 * 1000,
  });

  const defaultPolicyApiKey = await pRetry(() => getDefaultPolicyApiKey(resources.kibana), {
    retries: 10,
    minTimeout: 30 * 1000,
  });

  await new Promise((r) => setTimeout(r, 60000));

  const agentProcess = startAgentInDocker({ version: '7.16.0', fleetServerHost, policyApiKey: defaultPolicyApiKey });

  const baseCommand = `CYPRESS_BASE_URL=${resources.kibana} CYPRESS_ELASTICSEARCH_URL=${resources.elasticsearch} CYPRESS_ELASTICSEARCH_USERNAME=${credentials.username} CYPRESS_ELASTICSEARCH_PASSWORD=${credentials.password} CYPRESS_integrationFolder=cypress/upgrade_integration yarn --cwd ../../../x-pack/plugins/osquery cypress:run`;

  await execa.command(
    `${baseCommand} --spec cypress/upgrade_integration/setup.spec.ts --headed`,
    {
      shell: true,
    }
  );

  // wait for the agent to download and start osquerybeat
  await new Promise((r) => setTimeout(r, 180000));

  await execa.command(
    `${baseCommand} --spec cypress/upgrade_integration/live_query.spec.ts --headed`,
    {
      shell: true,
    }
  );

  await upgradeInstance({ deploymentId, version: '7.16.1' });

  await pRetry(() => isInstanceReady({ deploymentId }), {
    retries: 10,
    minTimeout: 30 * 1000,
  });

  console.log('running live_query.spec.ts');
  await execa.command(
    `${baseCommand} --spec cypress/upgrade_integration/live_query.spec.ts --headed`,
    {
      shell: true,
    }
  );

  await upgradeInstance({ deploymentId, version: '8.0.0-beta1' });

  await pRetry(() => isInstanceReady({ deploymentId }), {
    retries: 10,
    minTimeout: 30 * 1000,
  });

  console.log('running live_query.spec.ts');
  await execa.command(
    `${baseCommand} --spec cypress/upgrade_integration/live_query.spec.ts --headed`,
    {
      shell: true,
    }
  );

  console.log('deleting instance');
  await deleteInstance(deploymentId);

  console.log('killing agent');
  if (agentProcess) {
    if (!agentProcess.kill(9)) {
      console.log('Unable to kill agent process');
    }

    agentProcess.on('close', () => {
      console.log('Agent process closed');
    });
    delete agentProcess;
  }
})();
