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

const PROPOSAL_STORAGE_PREFIX = 'workflows.proposalRecords';

let actionHandlers: ProposalActionHandlers | null = null;
let currentWorkflowId: string | undefined;
let persistenceEnabled = true;
const proposalRecords = new Map<string, ProposalRecord>();
const listeners = new Set<() => void>();

const getStorageKey = (): string | null => {
  if (!currentWorkflowId) return null;
  return `${PROPOSAL_STORAGE_PREFIX}.${currentWorkflowId}`;
};

const persistToStorage = (): void => {
  if (!persistenceEnabled) return;
  const key = getStorageKey();
  if (!key) return;
  try {
    const records = Array.from(proposalRecords.values());
    localStorage.setItem(key, JSON.stringify(records));
  } catch {
    // localStorage unavailable or quota exceeded
  }
};

const loadFromStorage = (): void => {
  const key = getStorageKey();
  if (!key) return;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const records: ProposalRecord[] = JSON.parse(raw);
      for (const record of records) {
        proposalRecords.set(record.proposalId, record);
      }
    }
  } catch {
    // Invalid or corrupt data
  }
};

const notify = () => {
  listeners.forEach((l) => l());
};

export const setProposalActionHandlers = (handlers: ProposalActionHandlers | null): void => {
  actionHandlers = handlers;
};

export const setProposalRecord = (record: ProposalRecord): void => {
  proposalRecords.set(record.proposalId, record);
  persistToStorage();
  notify();
};

export const updateProposalStatus = (proposalId: string, status: ProposalStatus): void => {
  const record = proposalRecords.get(proposalId);
  if (record) {
    record.status = status;
    persistToStorage();
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
  persistToStorage();
  notify();
};

export const clearAllProposalRecords = (): void => {
  proposalRecords.clear();
  persistToStorage();
  notify();
};

export const initProposalPersistence = (workflowId?: string): void => {
  currentWorkflowId = workflowId;
  persistenceEnabled = true;
  loadFromStorage();
};

export const suspendPersistence = (): void => {
  persistenceEnabled = false;
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
