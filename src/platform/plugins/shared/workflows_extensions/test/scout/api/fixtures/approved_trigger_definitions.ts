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
    id: 'cases.caseCreated',
    schemaHash: '5b562db9463664a1e28ff2f3ee7edec229e83912569190cd8a83f53d38da9ed8',
  },
  {
    id: 'cases.caseUpdated',
    schemaHash: 'bf936f051ec83ba5d4b6b7612879f3aeb7405c911504e157c6607d485ed650c1',
  },
  {
    id: 'cases.caseStatusUpdated',
    schemaHash: '168673364f93e74cb472da685175d4acccc4b9a5bd851c2f9c62bbb8da15c7df',
  },
  {
    id: 'cases.attachmentsAdded',
    schemaHash: 'e1d2dc5b465290cb4244976882e258c600c416ae496e1096312515dd174e6336',
  },
  {
    id: 'cases.commentsAdded',
    schemaHash: '673830c048cad59a5813d0c1a73f90c8ce0cd42eae9fa50a5df70db2fe6bc6de',
  },
  {
    id: 'workflows.failed',
    schemaHash: '2ac7a279823d7ca59c4d47de93ea7bd7103b1953ea484cef7f489d12d0c81980',
  },
];
