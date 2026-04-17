/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument, YAMLMap } from 'yaml';
import { getTriggerNodesWithType } from './get_trigger_nodes_with_type';

describe('getTriggerNodesWithType', () => {
  it('returns trigger map nodes that have a type field', () => {
    const doc = parseDocument(`
triggers:
  - type: manual
  - type: alert
    with:
      rule_type: test
steps:
  - name: s1
    type: noop
`);
    const nodes = getTriggerNodesWithType(doc);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toBeInstanceOf(YAMLMap);
    expect(nodes[0].get('type')).toBe('manual');
    expect(nodes[1].get('type')).toBe('alert');
  });

  it('returns empty array when no triggers exist', () => {
    const doc = parseDocument(`
steps:
  - name: s1
    type: noop
`);
    expect(getTriggerNodesWithType(doc)).toEqual([]);
  });

  it('returns empty array for empty document', () => {
    const doc = parseDocument('');
    expect(getTriggerNodesWithType(doc)).toEqual([]);
  });

  it('does not include step type fields', () => {
    const doc = parseDocument(`
triggers:
  - type: manual
steps:
  - name: s1
    type: noop
  - name: s2
    type: http
`);
    const nodes = getTriggerNodesWithType(doc);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].get('type')).toBe('manual');
  });
});
