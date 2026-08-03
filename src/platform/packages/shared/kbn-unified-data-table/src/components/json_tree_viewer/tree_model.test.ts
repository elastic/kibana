/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { buildNodes, nodeToJsonValue, nodeToJsonString } from './tree_model';

describe('nodeToJsonValue', () => {
  it('rebuilds a nested object subtree', () => {
    const [node] = buildNodes({
      user: { name: 'Alice', roles: ['admin', 'viewer'], active: true },
    });
    expect(nodeToJsonValue(node)).toEqual({
      name: 'Alice',
      roles: ['admin', 'viewer'],
      active: true,
    });
  });

  it('rebuilds an array subtree, keeping element order and nested shape', () => {
    const [node] = buildNodes({ items: ['alpha', 2, { nested: true }] });
    expect(nodeToJsonValue(node)).toEqual(['alpha', 2, { nested: true }]);
  });

  it('preserves primitive types, including zero, false, and null', () => {
    const [node] = buildNodes({ value: { text: 'hi', count: 0, flag: false, missing: null } });
    expect(nodeToJsonValue(node)).toEqual({ text: 'hi', count: 0, flag: false, missing: null });
  });

  it('recovers the raw text of a search-highlighted leaf from its rendered node', () => {
    // A highlighted value arrives already rendered as a React element (matched terms wrapped in
    // `<mark>`); its raw value lives only in that node, so it must be read back from there.
    const highlighted = React.createElement(
      React.Fragment,
      null,
      'user ',
      React.createElement('mark', null, 'login'),
      ' ok'
    );
    const [node] = buildNodes({ log: { message: highlighted } });
    expect(nodeToJsonValue(node)).toEqual({ message: 'user login ok' });
  });
});

describe('nodeToJsonString', () => {
  it('pretty-prints the subtree with two-space indentation', () => {
    const [node] = buildNodes({ user: { name: 'Alice' } });
    expect(nodeToJsonString(node)).toBe('{\n  "name": "Alice"\n}');
  });
});
