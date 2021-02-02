/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const env = process.env;

export const kibanaTestUser = {
  username: env.TEST_KIBANA_USER || 'elastic',
  password: env.TEST_KIBANA_PASS || 'changeme',
};

export const kibanaServerTestUser = {
  username: env.TEST_KIBANA_SERVER_USER || 'kibana',
  password: env.TEST_KIBANA_SERVER_PASS || 'changeme',
};

export const adminTestUser = {
  username: env.TEST_ES_USER || 'elastic',
  password: env.TEST_ES_PASS || 'changeme',
};
