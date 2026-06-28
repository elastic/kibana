/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DEFAULT_WAIT_FOR_INPUT_TIMEOUT = '72h' as const;

/** Workflow context path: `context.hitl.externalResumeLink`. */
export const HITL_EXTERNAL_RESUME_LINK_CONTEXT_KEY = 'externalResumeLink' as const;

export const DEFAULT_HITL_INPUT_CHANNEL_MESSAGE =
  'Respond here: {{context.hitl.externalResumeLink}}' as const;
