/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument, YAMLMap } from 'yaml';
import { getStepNodesWithType, isStepLikeMap } from './get_step_nodes_with_type';

describe('isStepLikeMap', () => {
  it('returns true for a map with name and type', () => {
    const doc = parseDocument(`
steps:
  - name: s1
    type: noop
`);
    const stepsSeq = (doc.contents as YAMLMap).get('steps', true);
    const firstItem = (stepsSeq as any).items[0];
    expect(isStepLikeMap(firstItem)).toBe(true);
  });

  it('returns false for a map missing name', () => {
    const doc = parseDocument(`
items:
  - type: noop
`);
    const seq = (doc.contents as YAMLMap).get('items', true);
    const firstItem = (seq as any).items[0];
    expect(isStepLikeMap(firstItem)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isStepLikeMap(null)).toBe(false);
    expect(isStepLikeMap(undefined)).toBe(false);
  });

  it('returns false for a scalar', () => {
    expect(isStepLikeMap('hello')).toBe(false);
  });
});

describe('getStepNodesWithType', () => {
  it('finds step nodes with name and type fields', () => {
    const doc = parseDocument(`
steps:
  - name: step1
    type: http
    with:
      url: http://example.com
  - name: step2
    type: noop
`);
    const nodes = getStepNodesWithType(doc);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toBeInstanceOf(YAMLMap);
    expect(nodes[0].get('name')).toBe('step1');
    expect(nodes[1].get('name')).toBe('step2');
  });

  it('does not include type fields nested inside with blocks', () => {
    const doc = parseDocument(`
steps:
  - name: step1
    type: http
    with:
      type: POST
      url: http://example.com
`);
    const nodes = getStepNodesWithType(doc);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].get('name')).toBe('step1');
  });

  it('handles nested steps in foreach', () => {
    const doc = parseDocument(`
steps:
  - name: loop
    type: foreach
    foreach: "{{ items }}"
    steps:
      - name: inner
        type: noop
`);
    const nodes = getStepNodesWithType(doc);
    expect(nodes).toHaveLength(2);
    const names = nodes.map((n) => n.get('name'));
    expect(names).toContain('loop');
    expect(names).toContain('inner');
  });

  it('returns empty array for empty document', () => {
    const doc = parseDocument('');
    expect(getStepNodesWithType(doc)).toEqual([]);
  });

  it('does not include trigger type fields', () => {
    const doc = parseDocument(`
triggers:
  - type: manual
steps:
  - name: s1
    type: noop
`);
    const nodes = getStepNodesWithType(doc);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].get('name')).toBe('s1');
  });
});
