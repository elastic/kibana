/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const map = require('lodash/map')
const axios = require('axios');

const CLOUD_API_KEY = process.env.CLOUD_API_KEY_SECRET;

const request = axios.create({
  baseURL: 'https://staging.found.no/api/v1/',
  timeout: 10000,
  headers: { Authorization: `ApiKey ${CLOUD_API_KEY}` },
});

const getDeployments = async () => request.get('/deployments');

const deleteInstance = async (deploymentId) => {
  let response;
  try {
    response = await request.post(`deployments/${deploymentId}/_shutdown`);
  } catch (error) {
    console.log('error', error);
    throw error;
  }

  return response;
};

(async () => {
  await getDeployments().then(async (response) => {
    const deploymentIds = map(response.data.deployments, 'id')

    console.log('deploymentIds', deploymentIds)

    await Promise.all(deploymentIds.map(deleteInstance));
  });
})();
