/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * APPROVED TRIGGER DEFINITIONS
 *
 * This list must be kept up-to-date with all registered trigger definitions.
 * When a new trigger is registered, developers must:
 * 1. Add the trigger ID and schema hash to this list (alphabetically sorted)
 * 2. Get approval from the workflows-eng team
 *
 * If the event schema changes, the schema hash must be updated, and get the approval again.
 *
 * Example of an approved trigger definition entry:
 * {
 *   id: 'cases.updated',
 *   schemaHash: 'a1b2c3d4e5f6...',
 * },
 *
 * To get the schemaHash for a trigger: run the server, then GET internal/workflows_extensions/trigger_definitions
 * and copy the schemaHash from the response for the trigger id.
 */
export const APPROVED_TRIGGER_DEFINITIONS: Array<{ id: string; schemaHash: string }> = [
  {
    id: 'alerting.episodeAcked',
    schemaHash: 'd280f377a1b17bcbd655e93f00ebb80b1935ef93951115cc1559305a5da01942',
  },
  {
    id: 'alerting.episodeActivated',
    schemaHash: '91921d540292ae32b96893da10fd10ce746b2ede5c5f7f06e0bd19bdd31e8207',
  },
  {
    id: 'alerting.episodeAssigned',
    schemaHash: 'cab4d7b9ed82d802f6dd51f4d29327f7fb84bfabcf958a046c53ceb5d7136b0b',
  },
  {
    id: 'alerting.episodeDeactivated',
    schemaHash: 'a394bb060c7cb9ec0b0d279cc47afc0366f9813273872895331b3d29a66cc9a3',
  },
  {
    id: 'alerting.episodeSnoozed',
    schemaHash: 'ca2d9156382a2d132b94e6058488d1f78df92e539445403f1b315ea16a3e6270',
  },
  {
    id: 'alerting.episodeTagged',
    schemaHash: '4625536d4a9c39dd3f769ec13d304d21c11ff88f6c8b3254990a3773ff9aae8e',
  },
  {
    id: 'alerting.episodeUnacked',
    schemaHash: 'd280f377a1b17bcbd655e93f00ebb80b1935ef93951115cc1559305a5da01942',
  },
  {
    id: 'alerting.episodeUnassigned',
    schemaHash: 'd280f377a1b17bcbd655e93f00ebb80b1935ef93951115cc1559305a5da01942',
  },
  {
    id: 'alerting.episodeUnsnoozed',
    schemaHash: 'd280f377a1b17bcbd655e93f00ebb80b1935ef93951115cc1559305a5da01942',
  },
  {
    id: 'alerting.ruleCreated',
    schemaHash: '95d5d9bc425bbc2ef5391ee67d280aa42c1acfab230920a482e91d01a02c4a13',
  },
  {
    id: 'alerting.ruleDeleted',
    schemaHash: '95d5d9bc425bbc2ef5391ee67d280aa42c1acfab230920a482e91d01a02c4a13',
  },
  {
    id: 'alerting.ruleDisabled',
    schemaHash: '95d5d9bc425bbc2ef5391ee67d280aa42c1acfab230920a482e91d01a02c4a13',
  },
  {
    id: 'alerting.ruleEnabled',
    schemaHash: '95d5d9bc425bbc2ef5391ee67d280aa42c1acfab230920a482e91d01a02c4a13',
  },
  {
    id: 'alerting.ruleUpdated',
    schemaHash: '95d5d9bc425bbc2ef5391ee67d280aa42c1acfab230920a482e91d01a02c4a13',
  },
  {
    id: 'cases.attachmentsAdded',
    schemaHash: 'af8917afcff27e816e16aab810bb0295d4ea16931414fc266aa629f220e4592c',
  },
  {
    id: 'cases.caseCreated',
    schemaHash: '616f3b574681800b6ee48d4809ea220bd2179ddc97a08c72f77171c0844de98b',
  },
  {
    id: 'cases.caseStatusUpdated',
    schemaHash: 'fb77dec382f8f3be96e72d49cd5512f79bf37c8dba3eb11b97603a9acacaedf7',
  },
  {
    id: 'cases.caseUpdated',
    schemaHash: '5f4cb5e0a152336c08a9db71fd74da5557a69e4473e7d98d91166500d6f8a75f',
  },
  {
    id: 'cases.commentsAdded',
    schemaHash: '7e13967e0f1185cbd309f016b25d3631b514706e5217da41f8655e93d23d90c6',
  },
  {
    id: 'entityStore.entityAssetCriticalityUpdated',
    schemaHash: 'ef5a71ccf64832ea19fda336a36fbf0b8200a1bd4f703d78417075deedb77c3f',
  },
  {
    id: 'entityStore.entityRiskScoreChanged',
    schemaHash: '9f825d6e3cd79ed834759edfec89c88eef2be3a3e33b5872f53bddc365915593',
  },
  {
    id: 'workflows.failed',
    schemaHash: '2ac7a279823d7ca59c4d47de93ea7bd7103b1953ea484cef7f489d12d0c81980',
  },
];
