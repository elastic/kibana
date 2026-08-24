/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { APP_MAIN_SCROLL_CONTAINER_ID } from '../constants';
import { focusMainContent } from './focus_main_content';

describe('focusMainContent', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('falls back to the application scroll container', () => {
    const scroll = document.createElement('div');
    scroll.id = APP_MAIN_SCROLL_CONTAINER_ID;
    const focusSpy = jest.spyOn(scroll, 'focus');
    document.body.appendChild(scroll);

    focusMainContent();

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(scroll.getAttribute('tabindex')).toBe('-1');
  });

  it('prefers a main landmark over the scroll container', () => {
    const scroll = document.createElement('div');
    scroll.id = APP_MAIN_SCROLL_CONTAINER_ID;
    const landmark = document.createElement('main');
    scroll.appendChild(landmark);
    document.body.appendChild(scroll);

    const scrollFocus = jest.spyOn(scroll, 'focus');
    const landmarkFocus = jest.spyOn(landmark, 'focus');

    focusMainContent();

    expect(landmarkFocus).toHaveBeenCalledTimes(1);
    expect(scrollFocus).not.toHaveBeenCalled();
  });

  it('does nothing when no main content element is present', () => {
    expect(() => focusMainContent()).not.toThrow();
  });
});
