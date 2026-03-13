/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  acceptProposal,
  clearAllProposalRecords,
  clearProposalRecord,
  declineProposal,
  getAllProposalRecords,
  getProposalRecord,
  setProposalActionHandlers,
  setProposalRecord,
  subscribeToProposals,
  updateProposalStatus,
} from './proposal_status_bridge';
import type { ProposalRecord } from './proposal_status_bridge';

const createRecord = (id: string): ProposalRecord => ({
  proposalId: id,
  status: 'pending',
  beforeYaml: 'before',
  afterYaml: 'after',
  toolId: 'test_tool',
});

describe('proposal_status_bridge', () => {
  beforeEach(() => {
    clearAllProposalRecords();
    setProposalActionHandlers(null);
  });

  it('setProposalRecord stores a record and notifies listeners', () => {
    const listener = jest.fn();
    subscribeToProposals(listener);

    const record = createRecord('p1');
    setProposalRecord(record);

    expect(getProposalRecord('p1')).toEqual(record);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('updateProposalStatus updates the status field', () => {
    setProposalRecord(createRecord('p1'));
    updateProposalStatus('p1', 'accepted');

    expect(getProposalRecord('p1')?.status).toBe('accepted');
  });

  it('getProposalRecord returns undefined for unknown id', () => {
    expect(getProposalRecord('nonexistent')).toBeUndefined();
  });

  it('getAllProposalRecords returns all records', () => {
    setProposalRecord(createRecord('p1'));
    setProposalRecord(createRecord('p2'));

    const all = getAllProposalRecords();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.proposalId)).toEqual(['p1', 'p2']);
  });

  it('subscribeToProposals returns an unsubscribe function', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToProposals(listener);

    setProposalRecord(createRecord('p1'));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    setProposalRecord(createRecord('p2'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('clearProposalRecord removes a specific record', () => {
    setProposalRecord(createRecord('p1'));
    setProposalRecord(createRecord('p2'));

    clearProposalRecord('p1');

    expect(getProposalRecord('p1')).toBeUndefined();
    expect(getProposalRecord('p2')).toBeDefined();
  });

  it('clearAllProposalRecords removes all records', () => {
    setProposalRecord(createRecord('p1'));
    setProposalRecord(createRecord('p2'));

    clearAllProposalRecords();

    expect(getAllProposalRecords()).toHaveLength(0);
  });

  it('acceptProposal returns error when no handlers are set', async () => {
    const result = await acceptProposal('p1');

    expect(result).toEqual({
      success: false,
      message: 'Workflow editor is not available.',
    });
  });

  it('acceptProposal calls handler and updates status on success', async () => {
    setProposalRecord(createRecord('p1'));

    const handlers = {
      acceptProposal: jest.fn().mockResolvedValue(true),
      declineProposal: jest.fn(),
    };
    setProposalActionHandlers(handlers);

    const result = await acceptProposal('p1');

    expect(handlers.acceptProposal).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ success: true });
    expect(getProposalRecord('p1')?.status).toBe('accepted');
  });

  it('acceptProposal returns error when handler returns false', async () => {
    setProposalRecord(createRecord('p1'));

    const handlers = {
      acceptProposal: jest.fn().mockResolvedValue(false),
      declineProposal: jest.fn(),
    };
    setProposalActionHandlers(handlers);

    const result = await acceptProposal('p1');

    expect(result).toEqual({
      success: false,
      message: 'No matching pending proposal was found in the editor.',
    });
  });

  it('declineProposal returns error when no handlers are set', async () => {
    const result = await declineProposal('p1');

    expect(result).toEqual({
      success: false,
      message: 'Workflow editor is not available.',
    });
  });

  it('declineProposal calls handler and updates status on success', async () => {
    setProposalRecord(createRecord('p1'));

    const handlers = {
      acceptProposal: jest.fn(),
      declineProposal: jest.fn().mockResolvedValue(true),
    };
    setProposalActionHandlers(handlers);

    const result = await declineProposal('p1');

    expect(handlers.declineProposal).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ success: true });
    expect(getProposalRecord('p1')?.status).toBe('declined');
  });
});
