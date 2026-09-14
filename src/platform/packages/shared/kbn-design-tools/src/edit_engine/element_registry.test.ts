/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElementRegistry, applyEditChanges, revertEdits } from './element_registry';
import type { StyleEdit, TextEdit, MediaEdit } from './element_registry';
import { DEVTOOL_HIDDEN_ATTR, DEVTOOL_MANAGED_ATTR } from '../lib/constants';
import { softHideElement } from './clone_element';
import { setImportant } from '../lib/dom/set_important';
import { makeSession } from '../lib/tests/helpers';

describe('ElementRegistry', () => {
  let registry: ElementRegistry;

  beforeEach(() => {
    registry = new ElementRegistry();
  });

  describe('basic CRUD', () => {
    it('should store and retrieve a session by element reference', () => {
      const session = makeSession();
      registry.set(session);

      expect(registry.has(session.el)).toBe(true);
      expect(registry.get(session.el)).toBe(session);
      expect(registry.size).toBe(1);
    });

    it('should return undefined for unknown elements', () => {
      expect(registry.get(document.createElement('div'))).toBeUndefined();
    });

    it('should delete a session without touching the DOM', () => {
      const session = makeSession();
      document.body.appendChild(session.el);
      registry.set(session);

      registry.delete(session);

      expect(registry.has(session.el)).toBe(false);
      expect(document.body.contains(session.el)).toBe(true);
      session.el.remove();
    });
  });

  describe('getOrCreate', () => {
    it('should create a new edit-only session for an unknown element', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      const session = registry.getOrCreate(el);

      expect(session.el).toBe(el);
      expect(session.dx).toBe(0);
      expect(session.dy).toBe(0);
      expect(session.isDuplicate).toBe(false);
      expect(registry.has(el)).toBe(true);
      el.remove();
    });

    it('should return existing session if already registered', () => {
      const session = makeSession();
      registry.set(session);

      const result = registry.getOrCreate(session.el);
      expect(result).toBe(session);
      expect(registry.size).toBe(1);
    });
  });

  describe('removeSession', () => {
    it('should remove owned element (with referenceEl) from DOM', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const session = makeSession({ el, referenceEl: document.createElement('span') });
      registry.set(session);

      registry.removeSession(session);

      expect(document.body.contains(el)).toBe(false);
      expect(registry.has(el)).toBe(false);
    });

    it('should remove duplicate element from DOM', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const session = makeSession({ el, isDuplicate: true });
      registry.set(session);

      registry.removeSession(session);

      expect(document.body.contains(el)).toBe(false);
    });

    it('should NOT remove edit-only element from DOM', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const session = makeSession({ el, isDuplicate: false });
      registry.set(session);

      registry.removeSession(session);

      expect(document.body.contains(el)).toBe(true);
      expect(registry.has(el)).toBe(false);
      el.remove();
    });

    it('should revert style edits on removal', () => {
      const el = document.createElement('div');
      el.style.color = 'red';
      const session = makeSession({
        el,
        styleEdits: [{ element: el, property: 'color', original: 'red', originalPriority: '' }],
      });
      el.style.setProperty('color', 'blue', 'important');
      registry.set(session);

      registry.removeSession(session);

      expect(el.style.color).toBe('red');
    });

    it('should call cleanup callback', () => {
      const cleanup = jest.fn();
      const session = makeSession({ cleanup });
      registry.set(session);

      registry.removeSession(session);

      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetAll', () => {
    it('should clear all sessions and restore hidden elements', () => {
      const owned = document.createElement('div');
      const hidden = document.createElement('div');
      document.body.appendChild(owned);
      document.body.appendChild(hidden);

      softHideElement(hidden);

      const session = makeSession({
        el: owned,
        referenceEl: document.createElement('span'),
      });
      registry.set(session);

      registry.resetAll();

      expect(registry.size).toBe(0);
      expect(document.body.contains(owned)).toBe(false);
      expect(hidden.hasAttribute(DEVTOOL_HIDDEN_ATTR)).toBe(false);
      expect(hidden.style.visibility).not.toBe('hidden');
      hidden.remove();
    });
  });
});

describe('applyEditChanges', () => {
  it('should record undo entries and apply style changes', () => {
    const el = document.createElement('div');
    el.style.setProperty('color', 'red');
    const styleEdits: StyleEdit[] = [];
    const textEdits: TextEdit[] = [];
    const mediaEdits: MediaEdit[] = [];

    applyEditChanges(
      [{ element: el, property: 'color', value: 'blue' }],
      [],
      [],
      styleEdits,
      textEdits,
      mediaEdits
    );

    expect(el.style.getPropertyValue('color')).toBe('blue');
    expect(styleEdits).toHaveLength(1);
    expect(styleEdits[0].original).toBe('red');
  });

  it('should unfreeze child dimensions when style targets a managed element', () => {
    const managed = document.createElement('div');
    managed.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    const parent = document.createElement('div');
    const child = document.createElement('div');
    child.style.width = '50px';
    parent.appendChild(child);
    managed.appendChild(parent);

    applyEditChanges([{ element: parent, property: 'width', value: '400px' }], [], [], [], [], []);

    expect(parent.style.getPropertyValue('width')).toBe('400px');
    // Child dimensions should be unfrozen by reflowManagedStyle
    expect(child.style.width).toBe('');
  });

  it('should NOT unfreeze children when element is outside a managed tree', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    child.style.width = '50px';
    parent.appendChild(child);

    applyEditChanges([{ element: parent, property: 'width', value: '400px' }], [], [], [], [], []);

    expect(parent.style.getPropertyValue('width')).toBe('400px');
    // Child dimensions should be untouched — not managed
    expect(child.style.width).toBe('50px');
  });

  it('should apply text changes and unfreeze parent in managed tree', () => {
    const managed = document.createElement('div');
    managed.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    const parent = document.createElement('span');
    parent.style.width = '100px';
    parent.style.height = '40px';
    const textNode = document.createTextNode('old');
    parent.appendChild(textNode);
    managed.appendChild(parent);

    applyEditChanges([], [{ node: textNode, text: 'new text' }], [], [], [], []);

    expect(textNode.textContent).toBe('new text');
    // Parent dimensions should be unfrozen by reflowManagedText
    expect(parent.style.width).toBe('');
    expect(parent.style.height).toBe('');
  });

  it('should record reflow dimensions so revertEdits restores them', () => {
    const managed = document.createElement('div');
    managed.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    const parent = document.createElement('span');
    setImportant(parent, 'width', '100px');
    setImportant(parent, 'height', '40px');
    const child = document.createElement('span');
    setImportant(child, 'width', '80px');
    parent.appendChild(child);
    managed.appendChild(parent);
    const textNode = document.createTextNode('old');
    parent.appendChild(textNode);

    const styleEdits: StyleEdit[] = [];
    const textEdits: TextEdit[] = [];

    applyEditChanges(
      [],
      [{ node: textNode, text: 'much longer text', fontSize: '24px' }],
      [],
      styleEdits,
      textEdits,
      []
    );

    // Forward: parent dimensions are unfrozen, font-size applied
    expect(parent.style.getPropertyValue('width')).toBe('');
    expect(parent.style.getPropertyValue('font-size')).toBe('24px');

    // Revert everything
    revertEdits(styleEdits, textEdits, []);

    // Dimensions should be restored to original frozen values
    expect(parent.style.getPropertyValue('width')).toBe('100px');
    expect(parent.style.getPropertyValue('height')).toBe('40px');
    expect(child.style.getPropertyValue('width')).toBe('80px');
    expect(parent.style.getPropertyValue('font-size')).toBe('');
    expect(textNode.textContent).toBe('old');
  });

  it('should record reflow dimensions for style changes so revertEdits restores them', () => {
    const managed = document.createElement('div');
    managed.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    const parent = document.createElement('div');
    const child = document.createElement('div');
    setImportant(child, 'width', '50px');
    parent.appendChild(child);
    managed.appendChild(parent);

    const styleEdits: StyleEdit[] = [];

    applyEditChanges(
      [{ element: parent, property: 'width', value: '400px' }],
      [],
      [],
      styleEdits,
      [],
      []
    );

    expect(child.style.width).toBe('');

    revertEdits(styleEdits, [], []);

    expect(parent.style.getPropertyValue('width')).toBe('');
    expect(child.style.getPropertyValue('width')).toBe('50px');
  });

  it('should not capture style reflow dimensions outside managed root', () => {
    const wrapper = document.createElement('div');
    const managed = document.createElement('div');
    managed.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    const parent = document.createElement('div');
    wrapper.appendChild(managed);
    managed.appendChild(parent);

    setImportant(wrapper, 'width', '600px');

    const styleEdits: StyleEdit[] = [];
    applyEditChanges(
      [{ element: parent, property: 'width', value: '400px' }],
      [],
      [],
      styleEdits,
      [],
      []
    );

    const wrapperWidthUndo = styleEdits.find(
      (e) => e.element === wrapper && e.property === 'width'
    );
    expect(wrapperWidthUndo).toBeUndefined();
  });

  it('should not capture text reflow dimensions outside managed root', () => {
    const wrapper = document.createElement('div');
    const managed = document.createElement('div');
    managed.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    const parent = document.createElement('span');
    const textNode = document.createTextNode('old');

    parent.appendChild(textNode);
    managed.appendChild(parent);
    wrapper.appendChild(managed);

    setImportant(wrapper, 'width', '700px');

    const styleEdits: StyleEdit[] = [];
    const textEdits: TextEdit[] = [];

    applyEditChanges([], [{ node: textNode, text: 'new text' }], [], styleEdits, textEdits, []);

    const wrapperWidthUndo = styleEdits.find(
      (e) => e.element === wrapper && e.property === 'width'
    );
    expect(wrapperWidthUndo).toBeUndefined();
  });

  it('should unfreeze managed root height on text edits and restore it on revert', () => {
    const managed = document.createElement('div');
    managed.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    setImportant(managed, 'width', '300px');
    setImportant(managed, 'height', '200px');

    const parent = document.createElement('div');
    const textNode = document.createTextNode('old');
    parent.appendChild(textNode);
    managed.appendChild(parent);

    const styleEdits: StyleEdit[] = [];
    const textEdits: TextEdit[] = [];

    applyEditChanges(
      [],
      [{ node: textNode, text: 'much longer text that should force vertical growth' }],
      [],
      styleEdits,
      textEdits,
      []
    );

    // Width stays fixed for wrapping stability, height is unfrozen for growth.
    expect(managed.style.getPropertyValue('width')).toBe('300px');
    expect(managed.style.getPropertyValue('height')).toBe('');

    revertEdits(styleEdits, textEdits, []);

    expect(managed.style.getPropertyValue('width')).toBe('300px');
    expect(managed.style.getPropertyValue('height')).toBe('200px');
    expect(textNode.textContent).toBe('old');
  });

  it('should unfreeze managed root width for no-wrap text edits and restore it on revert', () => {
    const managed = document.createElement('div');
    managed.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    setImportant(managed, 'width', '123px');

    const parent = document.createElement('span');
    setImportant(parent, 'white-space', 'nowrap');
    const textNode = document.createTextNode('Saved 6 hr. ago');
    parent.appendChild(textNode);
    managed.appendChild(parent);

    const styleEdits: StyleEdit[] = [];
    const textEdits: TextEdit[] = [];

    applyEditChanges(
      [],
      [{ node: textNode, text: 'Saved 6 hr. ago aaaaaaaaa' }],
      [],
      styleEdits,
      textEdits,
      []
    );

    expect(managed.style.getPropertyValue('width')).toBe('');

    revertEdits(styleEdits, textEdits, []);

    expect(managed.style.getPropertyValue('width')).toBe('123px');
    expect(textNode.textContent).toBe('Saved 6 hr. ago');
  });
});
