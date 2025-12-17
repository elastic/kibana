/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const SERVERLESS_ONLY = [
  '@svlSecurity',
  '@svlSecurityEssentials',
  '@svlSecurityEase',
  '@svlOblt',
  '@svlLogsEssentials',
  '@svlSearch',
  '@svlWorkplaceAI',
];
const ESS_ONLY = ['@ess'];
// svlWorkplaceAI is truly serverless only and doesn't have a stateful counterpart
const DEPLOYMENT_AGNOSTIC = [
  '@ess',
  '@svlSecurity',
  '@svlSecurityEssentials',
  '@svlSecurityEase',
  '@svlOblt',
  '@svlLogsEssentials',
  '@svlSearch',
];
const PERFORMANCE = ['@perf'];

export const tags = {
  ESS_ONLY,
  SERVERLESS_ONLY,
  DEPLOYMENT_AGNOSTIC,
  PERFORMANCE,
};

export const tagsByMode = {
  stateful: '@ess',
  serverless: {
    workplaceai: '@svlWorkplaceAI',
    es: '@svlSearch',
    oblt: '@svlOblt',
    'oblt-logs-essentials': '@svlLogsEssentials',
    security: '@svlSecurity',
    'security-essentials': '@svlSecurityEssentials',
    'security-ease': '@svlSecurityEase',
  },
};
