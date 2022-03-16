/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-expect-error no types
import { SYSTEM_INDICES_SUPERUSER } from '@kbn/es';

const env = process.env;

export const kibanaTestUser = {
  username: env.TEST_KIBANA_USER || 'elastic',
  password: env.TEST_KIBANA_PASS || 'changeme',
};

export const kibanaServerTestUser = {
  username: env.TEST_KIBANA_SERVER_USER || 'kibana_system',
  password: env.TEST_KIBANA_SERVER_PASS || 'changeme',
};

export const adminTestUser = {
  username: env.TEST_ES_USER || 'elastic',
  password: env.TEST_ES_PASS || 'changeme',
};

/**
 * User with higher privileges than regular superuser role for writing to system indices
 */
export const systemIndicesSuperuser = {
  username: SYSTEM_INDICES_SUPERUSER,
  password: env.TEST_ES_PASS || 'changeme',
};
