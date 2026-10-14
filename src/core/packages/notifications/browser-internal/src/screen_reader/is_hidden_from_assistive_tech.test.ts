/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isHiddenFromAssistiveTech } from './is_hidden_from_assistive_tech';

describe('isHiddenFromAssistiveTech', () => {
  let container: HTMLElement;
  let element: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    element = document.createElement('div');
    container.appendChild(element);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns false when nothing hides the element', () => {
    expect(isHiddenFromAssistiveTech(element)).toBe(false);
  });

  // JAWS, NVDA and Narrator still read live regions outside of `aria-modal` elements
  it('returns false while an aria-modal element is open elsewhere on the page', () => {
    const modal = document.createElement('div');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);

    expect(isHiddenFromAssistiveTech(element)).toBe(false);
  });

  it.each([
    ['aria-hidden', 'true'],
    ['inert', ''],
  ])('returns true when an ancestor has %s', (attribute, value) => {
    container.setAttribute(attribute, value);

    expect(isHiddenFromAssistiveTech(element)).toBe(true);
  });
});
