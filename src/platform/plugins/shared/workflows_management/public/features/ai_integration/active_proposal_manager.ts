/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProposalManager } from './proposed_changes';

// Handle to the currently mounted workflow editor's ProposalManager, exposed
// so the save thunk can resolve pending AI decorations before persisting.
let active: ProposalManager | null = null;

export const setActiveProposalManager = (manager: ProposalManager | null): void => {
  if (manager && active && manager !== active) {
    // Overwrite implies the previous editor's cleanup didn't run — surface it.
    // eslint-disable-next-line no-console
    console.warn(
      '[workflowsManagement] Overwriting active ProposalManager while previous still registered.'
    );
  }
  active = manager;
};

/**
 * Accept pending diffs on the active editor and return the post-accept model
 * content. Returns `undefined` if there was nothing to accept.
 */
export const acceptAllActiveProposals = (): string | undefined => {
  if (!active?.hasPendingProposals()) return undefined;
  active.acceptAll();
  return active.getCurrentContent();
};
