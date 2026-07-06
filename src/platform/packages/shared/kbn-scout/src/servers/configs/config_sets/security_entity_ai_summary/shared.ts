/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The Entity AI Summary persistence feature is built on the Entity Store V2 metadata
// datastream, so the suite needs V2 enabled (experimental flag + UI setting) for the
// metadata assets to be installed and the persist/read routes to function.
export const securityEntityAiSummaryServerArgs = [
  `--xpack.securitySolution.enableExperimental=${JSON.stringify(['entityAnalyticsEntityStoreV2'])}`,
  `--uiSettings.overrides.securitySolution:entityStoreEnableV2=true`,
];
