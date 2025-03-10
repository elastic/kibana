/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const SERVERLESS_ONLY = ['@svlSecurity', '@svlOblt', '@svlSearch'];
const ESS_ONLY = ['@ess'];
const DEPLOYMENT_AGNOSTIC = SERVERLESS_ONLY.concat(ESS_ONLY);

export const tags = {
  ESS_ONLY,
  SERVERLESS_ONLY,
  DEPLOYMENT_AGNOSTIC,
};

export const tagsByMode = {
  stateful: '@ess',
  serverless: {
    es: '@svlSearch',
    oblt: '@svlOblt',
    security: '@svlSecurity',
  },
};
