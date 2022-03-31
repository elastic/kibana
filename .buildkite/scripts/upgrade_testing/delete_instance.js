/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const axios = require('axios');

const CLOUD_API_KEY = process.env.CLOUD_API_KEY_SECRET;

const request = axios.create({
  baseURL: 'https://staging.found.no/api/v1/',
  timeout: 10000,
  headers: { Authorization: `ApiKey ${CLOUD_API_KEY}` },
});

module.exports = async function (deploymentId) {
  if (!deploymentId) throw 'A deploymend id is needed for this action';
  let response;
  try {
    response = await request.post(`deployments/${deploymentId}/_shutdown`);
  } catch (error) {
    console.log('error', error);
    throw error;
  }

  return response;
};
