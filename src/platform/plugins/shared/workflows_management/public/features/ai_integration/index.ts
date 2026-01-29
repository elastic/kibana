/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  performMonacoEdit,
  insertAtLine,
  replaceRange,
  deleteRange,
  findStepRange,
  findInsertLineAfterLastStep,
} from './monaco_edit_utils';
export type { PerformMonacoEditOptions, StepRange } from './monaco_edit_utils';

export {
  createInsertStepTool,
  createModifyStepTool,
  createModifyStepPropertyTool,
  createModifyWorkflowPropertyTool,
  createDeleteStepTool,
  createReplaceYamlTool,
} from './browser_api_tools';
export type { EditorContext, BrowserApiToolDefinition } from './browser_api_tools';

export { ProposedChangesManager, PROPOSED_CHANGES_STYLES } from './proposed_changes';
export type { ProposedChange, PendingChange } from './proposed_changes';

export { InlineEditInputManager, INLINE_EDIT_STYLES } from './inline_edit_input';
export type { InlineEditSubmitCallback } from './inline_edit_input';

export { executeHeadlessAgent } from './headless_agent_service';
export type {
  HeadlessAgentOptions,
  HeadlessAgentResult,
} from './headless_agent_service';
