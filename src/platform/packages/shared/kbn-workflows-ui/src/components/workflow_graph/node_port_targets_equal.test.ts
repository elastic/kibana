/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NodePortTargets } from './compute_insertion_points';
import { nodePortTargetsEqual } from './node_port_targets_equal';

const makeTargets = (overrides: Partial<NodePortTargets> = {}): NodePortTargets => ({
  step: { sourceNodeId: 'a', stepName: 'a', isTerminal: false },
  fallbackTarget: { stepName: 'a', nodeId: 'a' },
  branches: new Map([
    ['steps', { slot: { kind: 'steps' }, ownerStepName: 'a', isTerminal: false }],
  ]),
  fallbackConnected: false,
  ...overrides,
});

describe('nodePortTargetsEqual', () => {
  it('treats structurally identical targets as equal', () => {
    expect(nodePortTargetsEqual(makeTargets(), makeTargets())).toBe(true);
  });

  it('detects step, fallback and branch differences', () => {
    const base = makeTargets();
    expect(
      nodePortTargetsEqual(base, makeTargets({ step: { sourceNodeId: 'a', isTerminal: true } }))
    ).toBe(false);
    expect(nodePortTargetsEqual(base, makeTargets({ fallbackTarget: undefined }))).toBe(false);
    expect(nodePortTargetsEqual(base, makeTargets({ fallbackConnected: true }))).toBe(false);
    expect(nodePortTargetsEqual(base, makeTargets({ branches: new Map() }))).toBe(false);
  });
});
