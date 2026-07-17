/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Attaching an entity to a case requires two independently-gated pieces:
//   1. `entityAttachmentsEnabled` — the Security Solution experimental flag that
//      registers the `security.entity` attachment type and surfaces the flyout
//      "Add to case" actions. Off by default.
//   2. `xpack.cases.attachments.enabled` — the Cases-owned boot-time setting that
//      turns on the unified attachments framework the `security.entity` type
//      depends on. Off by default and rolled out per serverless tier by Cases.
// Neither is on in the default Scout server, so this config set enables both to
// give the entity-attachment E2E suite a working feature to exercise.
// (`entityAnalyticsEntityStoreV2` is already on by default, so entities resolve a
// canonical `entity.id` without an extra flag here.)
export const securityEntityAttachmentsServerArgs = [
  `--xpack.securitySolution.enableExperimental=${JSON.stringify(['entityAttachmentsEnabled'])}`,
  '--xpack.cases.attachments.enabled=true',
];
