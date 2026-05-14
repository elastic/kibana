/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElementSession } from './element_registry';
import { startDragFromSession } from './drag_helpers';

// jsdom doesn't provide DOMRect
if (typeof globalThis.DOMRect === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).DOMRect = class DOMRect {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
    constructor(x = 0, y = 0, w = 0, h = 0) {
      this.x = x;
      this.y = y;
      this.width = w;
      this.height = h;
      this.top = y;
      this.right = x + w;
      this.bottom = y + h;
      this.left = x;
    }
    toJSON() {
      return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
  };
}

const makeSession = (el: HTMLElement): ElementSession => ({
  el,
  dx: 0,
  dy: 0,
  dw: 0,
  dh: 0,
  originalRect: new DOMRect(0, 0, 100, 50),
  isDuplicate: false,
  styleEdits: [],
  textEdits: [],
  sourceEdits: [],
});

describe('startDragFromSession — popover cleanup', () => {
  it('removes a portaled panel and sets aria-expanded to false', () => {
    // Set up: managed element with a toggle button
    const container = document.createElement('div');
    const toggle = document.createElement('button');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-controls', 'portal-panel-1');
    container.appendChild(toggle);

    // Portaled panel lives on document.body (outside the managed element)
    const panel = document.createElement('div');
    panel.id = 'portal-panel-1';
    document.body.appendChild(panel);

    const session = makeSession(container);
    startDragFromSession(session, 0, 0);

    // Panel should have been removed from the DOM
    expect(document.getElementById('portal-panel-1')).toBeNull();
    expect(panel.parentElement).toBeNull();
    // Toggle should be updated
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('leaves inline expanded content untouched (e.g. accordion)', () => {
    const container = document.createElement('div');
    const toggle = document.createElement('button');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-controls', 'inline-panel-1');
    container.appendChild(toggle);

    // Inline panel lives inside the managed element
    const panel = document.createElement('div');
    panel.id = 'inline-panel-1';
    container.appendChild(panel);

    const session = makeSession(container);
    startDragFromSession(session, 0, 0);

    // Panel should still be in the DOM inside the container
    expect(container.querySelector('#inline-panel-1')).toBe(panel);
    // Toggle should remain expanded
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('handles multiple toggles — removes portals, keeps inline', () => {
    const container = document.createElement('div');

    // Inline expansion (like a tree node)
    const inlineToggle = document.createElement('button');
    inlineToggle.setAttribute('aria-expanded', 'true');
    inlineToggle.setAttribute('aria-controls', 'tree-node-1');
    container.appendChild(inlineToggle);
    const inlinePanel = document.createElement('div');
    inlinePanel.id = 'tree-node-1';
    container.appendChild(inlinePanel);

    // Portaled popover
    const portalToggle = document.createElement('button');
    portalToggle.setAttribute('aria-expanded', 'true');
    portalToggle.setAttribute('aria-controls', 'popover-1');
    container.appendChild(portalToggle);
    const portalPanel = document.createElement('div');
    portalPanel.id = 'popover-1';
    document.body.appendChild(portalPanel);

    const session = makeSession(container);
    startDragFromSession(session, 0, 0);

    // Inline panel untouched
    expect(container.querySelector('#tree-node-1')).toBe(inlinePanel);
    expect(inlineToggle.getAttribute('aria-expanded')).toBe('true');

    // Portaled panel removed
    expect(document.getElementById('popover-1')).toBeNull();
    expect(portalToggle.getAttribute('aria-expanded')).toBe('false');

    portalPanel.remove();
  });

  it('skips toggles without aria-controls', () => {
    const container = document.createElement('div');
    const toggle = document.createElement('button');
    toggle.setAttribute('aria-expanded', 'true');
    // No aria-controls attribute
    container.appendChild(toggle);

    const session = makeSession(container);
    startDragFromSession(session, 0, 0);

    // Toggle stays as-is
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('handles duplicate IDs by checking inside the managed element', () => {
    const container = document.createElement('div');
    const toggle = document.createElement('button');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-controls', 'dup-panel');
    container.appendChild(toggle);

    // The panel lives INSIDE the managed element
    const inlinePanel = document.createElement('div');
    inlinePanel.id = 'dup-panel';
    container.appendChild(inlinePanel);

    // A duplicate with the same ID exists on document.body (from another copy)
    const externalDup = document.createElement('div');
    externalDup.id = 'dup-panel';
    document.body.appendChild(externalDup);

    const session = makeSession(container);
    startDragFromSession(session, 0, 0);

    // The inline panel should be untouched because querySelector finds it
    // inside the managed element first
    expect(container.querySelector('#dup-panel')).toBe(inlinePanel);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    externalDup.remove();
  });

  it('handles no expanded toggles gracefully', () => {
    const container = document.createElement('div');
    container.innerHTML = '<span>Hello</span>';

    const session = makeSession(container);
    // Should not throw
    const result = startDragFromSession(session, 100, 200);
    expect(result.type).toBe('drag');
  });
});
