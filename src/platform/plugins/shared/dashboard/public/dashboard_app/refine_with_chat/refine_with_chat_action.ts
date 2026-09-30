/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableApiContext } from '@kbn/presentation-publishing';

/**
 * Panel action that sends a dashboard panel to the chat so the agent can refine it in place.
 * Registered by the agent builder dashboards plugin; the id lives here so any panel can run it
 * through `uiActions` without depending on that plugin.
 */
export const REFINE_WITH_CHAT_ACTION_ID = 'refinePanelWithChat';

export interface RefineWithChatActionContext extends EmbeddableApiContext {
  /** Called when the user submits a prompt in the chat opened by the action. */
  onSubmit?: () => void;
  /** Called when the chat opened by the action closes. */
  onClose?: () => void;
}
