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

export interface ReportWorkflowAiProposalResolvedParams {
  eventName: string;
  workflowId?: string;
  proposalId: string;
  resolution: 'accepted' | 'rejected';
  toolId: string;
  isBulkAction: boolean;
}

export interface ReportWorkflowAiSessionCompletedParams {
  eventName: string;
  sessionType: WorkflowAiSessionType;
  workflowId?: string;
  proposalsAccepted: number;
  proposalsDeclined: number;
  proposalsPending: number;
}
