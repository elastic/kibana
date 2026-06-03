/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { getTriggerNodes, getTriggersPair } from './get_trigger_nodes';

describe('getTriggersPair', () => {
  it('returns the triggers pair when present', () => {
    const doc = parseDocument(`
triggers:
  - type: manual
steps:
  - name: s1
    type: noop
`);
    const pair = getTriggersPair(doc);
    expect(pair).not.toBeNull();
  });

  it('returns null when triggers key is absent', () => {
    const doc = parseDocument(`
steps:
  - name: s1
    type: noop
`);
    expect(getTriggersPair(doc)).toBeNull();
  });

  it('returns null for empty document', () => {
    const doc = parseDocument('');
    expect(getTriggersPair(doc)).toBeNull();
  });

  it('returns null for scalar document', () => {
    const doc = parseDocument('hello');
    expect(getTriggersPair(doc)).toBeNull();
  });
});

describe('getTriggerNodes', () => {
  it('finds trigger nodes with their types', () => {
    const doc = parseDocument(`
triggers:
  - type: manual
  - type: scheduled
    with:
      interval: 5m
steps:
  - name: s1
    type: noop
`);
    const nodes = getTriggerNodes(doc);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].triggerType).toBe('manual');
    expect(nodes[1].triggerType).toBe('scheduled');
  });

  it('returns empty array for document without triggers', () => {
    const doc = parseDocument(`
steps:
  - name: s1
    type: noop
`);
    expect(getTriggerNodes(doc)).toEqual([]);
  });

  it('returns empty array for empty document', () => {
    const doc = parseDocument('');
    expect(getTriggerNodes(doc)).toEqual([]);
  });

  it('does not pick up type fields from steps', () => {
    const doc = parseDocument(`
triggers:
  - type: manual
steps:
  - name: s1
    type: noop
`);
    const nodes = getTriggerNodes(doc);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].triggerType).toBe('manual');
  });
});
