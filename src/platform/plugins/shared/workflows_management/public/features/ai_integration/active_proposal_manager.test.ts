/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { acceptAllActiveProposals, setActiveProposalManager } from './active_proposal_manager';
import type { ProposalManager } from './proposed_changes';

const createStub = (hasPending: boolean, content = 'yaml: after') =>
  ({
    hasPendingProposals: jest.fn().mockReturnValue(hasPending),
    acceptAll: jest.fn(),
    getCurrentContent: jest.fn().mockReturnValue(content),
  } as unknown as ProposalManager);

describe('active_proposal_manager', () => {
  afterEach(() => {
    setActiveProposalManager(null);
  });

  it('returns undefined and does nothing when no manager is registered', () => {
    expect(acceptAllActiveProposals()).toBeUndefined();
  });

  it('returns undefined and does not call acceptAll when there are no pending proposals', () => {
    const manager = createStub(false);
    setActiveProposalManager(manager);
    expect(acceptAllActiveProposals()).toBeUndefined();
    expect(manager.acceptAll).not.toHaveBeenCalled();
  });

  it('accepts and returns the post-accept editor content', () => {
    const manager = createStub(true, 'yaml: accepted');
    setActiveProposalManager(manager);
    expect(acceptAllActiveProposals()).toBe('yaml: accepted');
    expect(manager.acceptAll).toHaveBeenCalledTimes(1);
  });

  it('setActiveProposalManager(null) unregisters the manager', () => {
    const manager = createStub(true);
    setActiveProposalManager(manager);
    setActiveProposalManager(null);
    acceptAllActiveProposals();
    expect(manager.acceptAll).not.toHaveBeenCalled();
  });

  it('warns when a manager is overwritten while a previous one is still registered', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setActiveProposalManager(createStub(false));
    setActiveProposalManager(createStub(false));
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Overwriting active ProposalManager')
    );
    warn.mockRestore();
  });
});
