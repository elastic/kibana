/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Keep in sync with workflows_management scout test fixtures/constants.ts */
export const SCOUT_EXTERNAL_RESUME_SIGNING_KEY = 'scout-external-resume-signing-key-min-32-chars';

export const externalResumeServerArgs = [
  `--workflowsManagement.externalResume.signingKey=${SCOUT_EXTERNAL_RESUME_SIGNING_KEY}`,
  `--workflowsExecutionEngine.externalResume.signingKey=${SCOUT_EXTERNAL_RESUME_SIGNING_KEY}`,
];
