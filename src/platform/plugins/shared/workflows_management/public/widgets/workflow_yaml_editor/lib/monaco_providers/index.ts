/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Provider interfaces and types
export type {
  HoverContext,
  ActionContext,
  ParameterContext,
  StepContext,
  ActionInfo,
  ConnectorExamples,
  MonacoConnectorHandler,
  MonacoHandlerRegistry,
  ProviderConfig,
  FixInChatCallback,
} from './provider_interfaces';

// Provider registry
export {
  getMonacoHandlerRegistry,
  registerMonacoConnectorHandler,
  getMonacoConnectorHandler,
  clearHandlerRegistry,
} from './provider_registry';

// Unified providers
export {
  UnifiedHoverProvider,
  createUnifiedHoverProvider,
  registerUnifiedHoverProvider,
} from './unified_hover_provider';

// Fix in Chat code action provider
export {
  FIX_IN_CHAT_COMMAND_ID,
  createFixInChatCodeActionProvider,
  registerFixInChatCodeActionProvider,
} from './fix_in_chat_code_action_provider';
export type { FixInChatCallback } from './fix_in_chat_code_action_provider';

// REMOVED: UnifiedDecorationsProvider - no longer needed in new architecture
