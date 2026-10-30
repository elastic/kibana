/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildChildEventChainContext } from './build_child_event_chain_context';

describe('buildChildEventChainContext', () => {
  it("appends the parent to its visited list and keeps the parent's depth", () => {
    expect(
      buildChildEventChainContext({
        workflowId: 'parent',
        eventChainDepth: 1,
        eventChainVisitedWorkflowIds: ['emitter'],
      })
    ).toEqual({
      parentEventChain: { eventChainDepth: 1, eventChainVisitedWorkflowIds: ['emitter', 'parent'] },
    });
  });

  it('marks the parent as visited even when the parent has no event chain', () => {
    expect(buildChildEventChainContext({ workflowId: 'parent' })).toEqual({
      parentEventChain: { eventChainVisitedWorkflowIds: ['parent'] },
    });
  });
});
