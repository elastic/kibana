/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flattenElementTree } from './flatten_element_tree';
import { DEVTOOL_HIDDEN_ATTR } from '../lib/constants';
import '../lib/tests/mocks';

describe('flattenElementTree', () => {
  it('should return a single leaf node for an element with no children', () => {
    const el = document.createElement('div');
    const nodes = flattenElementTree(el, 0);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].tag).toBe('div');
    expect(nodes[0].hasChildren).toBe(false);
    expect(nodes[0].depth).toBe(0);
  });

  it('should wrap children between opening and closing nodes', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);

    const nodes = flattenElementTree(parent, 0);

    expect(nodes).toHaveLength(3);
    expect(nodes[0].tag).toBe('div');
    expect(nodes[0].hasChildren).toBe(true);
    expect(nodes[0].isClosing).toBeUndefined();
    expect(nodes[1].tag).toBe('span');
    expect(nodes[1].depth).toBe(1);
    expect(nodes[2].tag).toBe('div');
    expect(nodes[2].isClosing).toBe(true);
  });

  it('should skip elements with DEVTOOL_HIDDEN_ATTR', () => {
    const parent = document.createElement('div');
    const visible = document.createElement('span');
    const hidden = document.createElement('span');
    hidden.setAttribute(DEVTOOL_HIDDEN_ATTR, '');
    parent.appendChild(visible);
    parent.appendChild(hidden);

    const nodes = flattenElementTree(parent, 0);

    const tags = nodes.map((n) => `${n.tag}${n.isClosing ? '/close' : ''}`);
    expect(tags).toEqual(['div', 'span', 'div/close']);
  });

  it('should skip <style> tags', () => {
    const parent = document.createElement('div');
    const style = document.createElement('style');
    style.textContent = '.foo { color: red; }';
    const span = document.createElement('span');
    parent.appendChild(style);
    parent.appendChild(span);

    const nodes = flattenElementTree(parent, 0);
    const tags = nodes.filter((n) => !n.isClosing).map((n) => n.tag);
    expect(tags).not.toContain('style');
    expect(tags).toContain('span');
  });

  it('should treat SVG as a leaf node (no internal children)', () => {
    const parent = document.createElement('div');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.appendChild(path);
    parent.appendChild(svg);

    const nodes = flattenElementTree(parent, 0);
    const tags = nodes.filter((n) => !n.isClosing).map((n) => n.tag);
    expect(tags).toContain('svg');
    expect(tags).not.toContain('path');
  });

  it('should collapse to self-closing when all children are filtered', () => {
    const parent = document.createElement('div');
    const hidden = document.createElement('span');
    hidden.setAttribute(DEVTOOL_HIDDEN_ATTR, '');
    parent.appendChild(hidden);

    const nodes = flattenElementTree(parent, 0);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].hasChildren).toBe(false);
  });

  it('should respect depth limit', () => {
    // MAX_TREE_DEPTH is 100, but passing a high start depth should bail
    const el = document.createElement('div');
    const nodes = flattenElementTree(el, 101);
    expect(nodes).toHaveLength(0);
  });
});
