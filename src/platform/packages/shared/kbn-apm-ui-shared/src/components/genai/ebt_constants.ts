/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * EBT click action names for GenAI components. Consumers provide the
 * `element` via the components' `ebt` prop so each host surface can be
 * distinguished in the click events.
 */
export const GENAI_EBT_CLICK_ACTIONS = {
  /** User copies a prompt/response message from the GenAI conversation view. */
  COPY_MESSAGE: 'copyGenAiMessage',
  /**
   * User opens the GenAI tab; the `element` identifies the host surface. The
   * host app is available on every click event via `context.applicationId`.
   */
  VIEW_GENAI: 'viewGenAi',
} as const;
