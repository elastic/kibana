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
    schemaHash: 'b2d6d720052206559b91d1558e8c2d66376d6eaad15db1f1748cfd59ef894f5f',
  },
  {
    id: 'alerting.episodeAssigned',
    schemaHash: 'cab4d7b9ed82d802f6dd51f4d29327f7fb84bfabcf958a046c53ceb5d7136b0b',
  },
  {
    id: 'alerting.episodeDeactivated',
    schemaHash: '69cf494f29d6410e2df10766ccaef4641e6b8718c8dc3b01e5833cb9a1de1238',
  },
  {
    id: 'alerting.episodeSnoozed',
    schemaHash: 'ca2d9156382a2d132b94e6058488d1f78df92e539445403f1b315ea16a3e6270',
  },
  {
    id: 'alerting.episodeTagged',
    schemaHash: 'c69b1bf9ecdac0753366584be4240b0ae6423ce0fd9aa537a618b4028926f792',
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
    id: 'cases.caseCreated',
    schemaHash: 'b325010646fcad7129bd1258b469fd58ec4f59b5263bb9c92cec26ecf9e821b6',
  },
  {
    id: 'cases.caseUpdated',
    schemaHash: '2ca51f8c16151b4fc429ec57336576917eafb0b19bb24c04ea7bfb808be70b0e',
  },
  {
    id: 'cases.caseStatusUpdated',
    schemaHash: 'b3d75b1aa9b2f68bfe7bded8b74c9629b30d4f83a01f8401f9a0b910dbaf0f5a',
  },
  {
    id: 'cases.attachmentsAdded',
    schemaHash: 'f971dc82cbea674bf69d2d7bcbbe37de29041f4b3a539135667225b4db7f7228',
  },
  {
    id: 'cases.commentsAdded',
    schemaHash: '69571f91dec792a9ca651fa5ef0210bb817704df163de0f200f88540e5729e6d',
  },
  {
    id: 'workflows.failed',
    schemaHash: '2ac7a279823d7ca59c4d47de93ea7bd7103b1953ea484cef7f489d12d0c81980',
  },
];
