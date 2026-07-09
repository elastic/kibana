/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProposalManager } from './proposed_changes';

// Module-level handle to the ProposalManager owned by the currently mounted
// workflow editor. Exposed so non-React callers (e.g. the save thunk) can
// resolve any pending AI accept/reject decorations before persisting — hitting
// Save is treated as an implicit acceptance of the diff on screen.
let active: ProposalManager | null = null;

export const setActiveProposalManager = (manager: ProposalManager | null): void => {
  if (manager && active && manager !== active) {
    // Only one workflow editor mounts at a time — an overwrite means the
    // previous editor's cleanup didn't run or ran out of order. Warn so the
    // regression is visible instead of silently discarded.
    // eslint-disable-next-line no-console
    console.warn(
      '[workflowsManagement] Overwriting active ProposalManager while previous still registered.'
    );
  }
  active = manager;
};

/**
 * Accept any pending AI diff decorations on the active editor and return the
 * post-accept model content — so callers (the save thunk) can dispatch the
 * updated YAML into Redux instead of relying on the async model→Redux sync.
 * Returns `undefined` if there was nothing to accept.
 */
export const acceptAllActiveProposals = (): string | undefined => {
  if (!active?.hasPendingProposals()) return undefined;
  active.acceptAll();
  return active.getCurrentContent();
};
