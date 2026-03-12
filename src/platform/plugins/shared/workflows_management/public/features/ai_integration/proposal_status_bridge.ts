/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type ProposalStatus = 'pending' | 'accepted' | 'declined';

export interface ProposalRecord {
  proposalId: string;
  status: ProposalStatus;
  beforeYaml: string;
  afterYaml: string;
  description?: string;
  toolId: string;
}

interface ProposalActionHandlers {
  acceptProposal: (proposalId: string) => Promise<boolean> | boolean;
  declineProposal: (proposalId: string) => Promise<boolean> | boolean;
}

interface ProposalActionResult {
  success: boolean;
  message?: string;
}

let actionHandlers: ProposalActionHandlers | null = null;
const proposalRecords = new Map<string, ProposalRecord>();
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((l) => l());
};

export const setProposalActionHandlers = (handlers: ProposalActionHandlers | null): void => {
  actionHandlers = handlers;
};

export const setProposalRecord = (record: ProposalRecord): void => {
  proposalRecords.set(record.proposalId, record);
  notify();
};

export const updateProposalStatus = (proposalId: string, status: ProposalStatus): void => {
  const record = proposalRecords.get(proposalId);
  if (record) {
    record.status = status;
    notify();
  }
};

export const getProposalRecord = (proposalId: string): ProposalRecord | undefined => {
  return proposalRecords.get(proposalId);
};

export const getAllProposalRecords = (): ProposalRecord[] => {
  return Array.from(proposalRecords.values());
};

export const subscribeToProposals = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const clearProposalRecord = (proposalId: string): void => {
  proposalRecords.delete(proposalId);
  notify();
};

export const clearAllProposalRecords = (): void => {
  proposalRecords.clear();
  notify();
};

export const acceptProposal = async (proposalId: string): Promise<ProposalActionResult> => {
  if (!actionHandlers) {
    return { success: false, message: 'Workflow editor is not available.' };
  }

  const result = await actionHandlers.acceptProposal(proposalId);
  if (!result) {
    return { success: false, message: 'No matching pending proposal was found in the editor.' };
  }

  updateProposalStatus(proposalId, 'accepted');
  return { success: true };
};

export const declineProposal = async (proposalId: string): Promise<ProposalActionResult> => {
  if (!actionHandlers) {
    return { success: false, message: 'Workflow editor is not available.' };
  }

  const result = await actionHandlers.declineProposal(proposalId);
  if (!result) {
    return { success: false, message: 'No matching pending proposal was found in the editor.' };
  }

  updateProposalStatus(proposalId, 'declined');
  return { success: true };
};
