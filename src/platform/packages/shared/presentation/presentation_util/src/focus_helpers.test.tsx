/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { focusFirstFocusable } from './focus_helpers';

describe('focusFirstFocusable', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('focuses the first focusable descendant of the target', () => {
    const container = document.createElement('div');
    const button = document.createElement('button');
    container.appendChild(button);
    document.body.appendChild(container);

    focusFirstFocusable(container);
    jest.runAllTimers();

    expect(document.activeElement).toBe(button);
  });

  it('focuses the target itself when it is focusable', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    focusFirstFocusable(button);
    jest.runAllTimers();

    expect(document.activeElement).toBe(button);
  });

  it('does nothing when the resolved target is null', () => {
    const previouslyFocused = document.createElement('input');
    document.body.appendChild(previouslyFocused);
    previouslyFocused.focus();

    focusFirstFocusable(null);
    jest.runAllTimers();

    expect(document.activeElement).toBe(previouslyFocused);
  });

  it('resolves the target lazily inside the deferred callback', () => {
    // The element only exists by the time the deferred focus runs, mirroring a
    // trigger that is re-rendered after focus is requested.
    focusFirstFocusable(() => document.getElementById('deferred'));

    const button = document.createElement('button');
    button.id = 'deferred';
    document.body.appendChild(button);

    jest.runAllTimers();

    expect(document.activeElement).toBe(button);
  });

  it('does not steal focus when it is already inside the target', () => {
    const container = document.createElement('div');
    const outerButton = document.createElement('button');
    const innerButton = document.createElement('button');
    container.appendChild(outerButton);
    container.appendChild(innerButton);
    document.body.appendChild(container);

    innerButton.focus();

    focusFirstFocusable(container);
    jest.runAllTimers();

    // focus stays on the already-focused descendant instead of jumping to the first one
    expect(document.activeElement).toBe(innerButton);
  });

  describe('when the target is hidden with visibility: hidden', () => {
    it('temporarily overrides visibility so the focus lands', () => {
      const hiddenContainer = document.createElement('div');
      hiddenContainer.style.visibility = 'hidden';
      const button = document.createElement('button');
      hiddenContainer.appendChild(button);
      document.body.appendChild(hiddenContainer);

      focusFirstFocusable(hiddenContainer);
      jest.runAllTimers();

      expect(document.activeElement).toBe(button);
      // the focusable element's own visibility is overridden so it can receive focus,
      // while the hidden ancestor is left untouched
      expect(button.style.visibility).toBe('visible');
      expect(hiddenContainer.style.visibility).toBe('hidden');
    });

    it('restores the original visibility once focus leaves', () => {
      const hiddenContainer = document.createElement('div');
      hiddenContainer.style.visibility = 'hidden';
      const button = document.createElement('button');
      hiddenContainer.appendChild(button);
      document.body.appendChild(hiddenContainer);

      focusFirstFocusable(hiddenContainer);
      jest.runAllTimers();
      expect(button.style.visibility).toBe('visible');

      button.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

      expect(button.style.visibility).toBe('');
    });

    it('does not touch visibility when the target is already visible', () => {
      const container = document.createElement('div');
      const button = document.createElement('button');
      container.appendChild(button);
      document.body.appendChild(container);

      focusFirstFocusable(container);
      jest.runAllTimers();

      expect(document.activeElement).toBe(button);
      expect(container.style.visibility).toBe('');
    });

    it('restores the overridden visibility immediately when the focus does not land', () => {
      const hiddenContainer = document.createElement('div');
      hiddenContainer.style.visibility = 'hidden';
      const button = document.createElement('button');
      // A disabled button cannot receive focus, so no `focusout` will ever fire.
      button.disabled = true;
      hiddenContainer.appendChild(button);
      document.body.appendChild(hiddenContainer);

      focusFirstFocusable(hiddenContainer);
      jest.runAllTimers();

      expect(document.activeElement).not.toBe(button);
      // the element's overridden visibility is restored right away instead of being
      // left overridden forever
      expect(button.style.visibility).toBe('');
    });
  });
});
