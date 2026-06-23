/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useSyncExternalStore } from 'react';
import {
  getAgentWorkspaceContent,
  subscribeAgentWorkspaceContent,
} from './agent_slot_registry';
import { AgentSlotPlaceholder } from './agent_slot_placeholder';

/**
 * Renders plugin-registered agent workspace content, or the POC placeholder when
 * no registration exists (e.g. Agent Builder plugin disabled).
 */
export function AgentWorkspaceSlot() {
  const Content = useSyncExternalStore(
    subscribeAgentWorkspaceContent,
    getAgentWorkspaceContent,
    getAgentWorkspaceContent
  );

  if (Content) {
    return <Content />;
  }

  return <AgentSlotPlaceholder />;
}
