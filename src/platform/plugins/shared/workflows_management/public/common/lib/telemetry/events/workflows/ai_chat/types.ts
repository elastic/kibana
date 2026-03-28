/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum WorkflowAiChatEventTypes {
  /**
   * When a user opens the AI chat for workflow editing.
   * Fires from the workflow editor page only.
   */
  WorkflowAiChatOpened = 'workflows_ai_chat_opened',
  /**
   * When a proposal (inline diff) is shown to the user in the editor.
   * Fires from the attachment bridge when the server emits a yaml_changed event.
   */
  WorkflowAiProposalReceived = 'workflows_ai_proposal_received',
  /**
   * When a proposal (inline diff) is accepted or rejected by the user.
   */
  WorkflowAiProposalResolved = 'workflows_ai_proposal_resolved',
  /**
   * When the AI chat session ends (user navigates away from the workflow editor).
   * Fires from the workflow editor page only.
   */
  WorkflowAiSessionCompleted = 'workflows_ai_session_completed',
}

export type WorkflowAiChatEntryPoint = 'workflow_editor' | 'header_on_editor_page';
export type WorkflowAiSessionType = 'edit' | 'create';

export interface ReportWorkflowAiChatOpenedParams {
  eventName: string;
  entryPoint: WorkflowAiChatEntryPoint;
  sessionType: WorkflowAiSessionType;
  workflowId?: string;
}

export interface ReportWorkflowAiProposalReceivedParams {
  eventName: string;
  workflowId?: string;
  conversationId?: string;
  proposalId: string;
  toolId: string;
  sessionType: WorkflowAiSessionType;
}

export interface ReportWorkflowAiProposalResolvedParams {
  eventName: string;
  workflowId?: string;
  conversationId?: string;
  proposalId: string;
  resolution: 'accepted' | 'rejected';
  toolId: string;
  isBulkAction: boolean;
}

export interface ReportWorkflowAiSessionCompletedParams {
  eventName: string;
  sessionType: WorkflowAiSessionType;
  workflowId?: string;
  conversationId?: string;
  proposalsAccepted: number;
  proposalsDeclined: number;
  proposalsPending: number;
}
