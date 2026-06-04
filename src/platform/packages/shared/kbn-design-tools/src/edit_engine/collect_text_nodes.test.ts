/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { collectAllTextNodes } from './collect_text_nodes';

describe('collectAllTextNodes', () => {
  it('should collect non-empty text nodes', () => {
    const el = document.createElement('div');
    el.innerHTML = '<span>Hello</span> <b>World</b>';

    const nodes = collectAllTextNodes(el);

    expect(nodes).toHaveLength(2);
    expect(nodes[0].textContent).toBe('Hello');
    expect(nodes[1].textContent).toBe('World');
  });

  it('should skip whitespace-only text nodes', () => {
    const el = document.createElement('div');
    el.innerHTML = '<span>   </span><b>Text</b>';

    const nodes = collectAllTextNodes(el);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].textContent).toBe('Text');
  });

  it('should skip aria-hidden subtrees', () => {
    const el = document.createElement('div');
    el.innerHTML = '<span aria-hidden="true">Hidden</span><span>Visible</span>';

    const nodes = collectAllTextNodes(el);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].textContent).toBe('Visible');
  });

  it('should skip elements with hidden attribute', () => {
    const el = document.createElement('div');
    const hidden = document.createElement('span');
    hidden.setAttribute('hidden', '');
    hidden.textContent = 'Hidden';
    const visible = document.createElement('span');
    visible.textContent = 'Visible';
    el.appendChild(hidden);
    el.appendChild(visible);

    const nodes = collectAllTextNodes(el);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].textContent).toBe('Visible');
  });

  it('should skip display:none elements', () => {
    const el = document.createElement('div');
    const hidden = document.createElement('span');
    hidden.style.display = 'none';
    hidden.textContent = 'Hidden';
    el.appendChild(hidden);

    const nodes = collectAllTextNodes(el);
    expect(nodes).toHaveLength(0);
  });

  it('should skip euiScreenReaderOnly elements', () => {
    const el = document.createElement('div');
    const sr = document.createElement('span');
    sr.classList.add('euiScreenReaderOnly');
    sr.textContent = 'ScreenReaderOnly';
    const visible = document.createElement('span');
    visible.textContent = 'Visible';
    el.appendChild(sr);
    el.appendChild(visible);

    const nodes = collectAllTextNodes(el);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].textContent).toBe('Visible');
  });

  it('should skip Emotion-prefixed euiScreenReaderOnly elements', () => {
    const el = document.createElement('div');
    const sr = document.createElement('span');
    sr.classList.add('css-gb1zbv-euiScreenReaderOnly');
    sr.textContent = 'ScreenReaderOnly';
    const visible = document.createElement('span');
    visible.textContent = 'Visible';
    el.appendChild(sr);
    el.appendChild(visible);

    const nodes = collectAllTextNodes(el);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].textContent).toBe('Visible');
  });

  it('should recursively collect from nested elements', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><div><span>Deep</span></div></div>';

    const nodes = collectAllTextNodes(el);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].textContent).toBe('Deep');
  });
});
