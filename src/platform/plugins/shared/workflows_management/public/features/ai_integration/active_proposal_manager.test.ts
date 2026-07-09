/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  __resetActiveProposalManagerForTest,
  acceptAllActiveProposals,
  setActiveProposalManager,
} from './active_proposal_manager';
import type { ProposalManager } from './proposed_changes';

const createStub = (hasPending: boolean) =>
  ({
    hasPendingProposals: jest.fn().mockReturnValue(hasPending),
    acceptAll: jest.fn(),
  } as unknown as ProposalManager);

describe('active_proposal_manager', () => {
  afterEach(() => {
    __resetActiveProposalManagerForTest();
  });

  it('does nothing when no manager is registered', () => {
    expect(() => acceptAllActiveProposals()).not.toThrow();
  });

  it('does not call acceptAll when there are no pending proposals', () => {
    const manager = createStub(false);
    setActiveProposalManager(manager);
    acceptAllActiveProposals();
    expect(manager.acceptAll).not.toHaveBeenCalled();
  });

  it('calls acceptAll on the registered manager when proposals are pending', () => {
    const manager = createStub(true);
    setActiveProposalManager(manager);
    acceptAllActiveProposals();
    expect(manager.acceptAll).toHaveBeenCalledTimes(1);
  });

  it('setActiveProposalManager(null) unregisters the manager', () => {
    const manager = createStub(true);
    setActiveProposalManager(manager);
    setActiveProposalManager(null);
    acceptAllActiveProposals();
    expect(manager.acceptAll).not.toHaveBeenCalled();
  });
});
