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
  active = manager;
};

export const acceptAllActiveProposals = (): void => {
  if (active?.hasPendingProposals()) {
    active.acceptAll();
  }
};

export const __resetActiveProposalManagerForTest = (): void => {
  active = null;
};
