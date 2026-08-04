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
   * User opens the GenAI tab; the `element` identifies the host surface and
   * the `detail` the host app ({@link GENAI_EBT_HOSTS}).
   */
  VIEW_GENAI: 'viewGenAi',
} as const;

/** Host app discriminator used as `detail` in GenAI click events. */
export const GENAI_EBT_HOSTS = {
  APM: 'apm',
  DISCOVER: 'discover',
} as const;

export type GenAiEbtHost = (typeof GENAI_EBT_HOSTS)[keyof typeof GENAI_EBT_HOSTS];
