/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const SECURITY_PROJECT_SETTINGS = [
  'securitySolution:refreshIntervalDefaults',
  'securitySolution:timeDefaults',
  'securitySolution:defaultIndex',
  'securitySolution:defaultThreatIndex',
  'securitySolution:defaultAnomalyScore',
  // This setting doesn't seem to be registered anywhere in serverless
  // 'securitySolution:enableGroupedNav',
  'securitySolution:rulesTableRefresh',
  'securitySolution:ipReputationLinks',
  'securitySolution:enableCcsWarning',
  'securitySolution:showRelatedIntegrations',
];
