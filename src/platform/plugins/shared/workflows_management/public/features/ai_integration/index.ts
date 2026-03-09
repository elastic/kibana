/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { findStepRange, findInsertLineAfterLastStep } from './monaco_edit_utils';
export type { StepRange } from './monaco_edit_utils';

export {
  createInsertStepTool,
  createModifyStepTool,
  createModifyStepPropertyTool,
  createModifyWorkflowPropertyTool,
  createDeleteStepTool,
  createReplaceYamlTool,
} from './browser_api_tools';
export type { EditorContext, BrowserApiToolDefinition } from './browser_api_tools';

export { ProposalManager } from './proposed_changes';
export type { ProposedChange, PendingProposal, ProposalManagerOptions } from './proposed_changes';

export {
  setProposalActionHandlers,
  setProposalRecord,
  updateProposalStatus,
  getProposalRecord,
  getAllProposalRecords,
  subscribeToProposals,
  clearProposalRecord,
  clearAllProposalRecords,
  initProposalPersistence,
  suspendPersistence,
  acceptProposal,
  declineProposal,
} from './proposal_status_bridge';
export type { ProposalStatus, ProposalRecord } from './proposal_status_bridge';
