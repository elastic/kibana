/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/core-chrome-layout-constants', () => ({
  MAIN_CONTENT_SELECTORS: ['#main-content'],
}));

import { focusMainContent } from './focus_main_content';

describe('focusMainContent', () => {
  it('focuses the first matching main content element', () => {
    const main = document.createElement('div');
    main.id = 'main-content';

    const focusSpy = jest.spyOn(main, 'focus');

    document.body.appendChild(main);

    focusMainContent();

    expect(focusSpy).toHaveBeenCalledTimes(1);

    main.remove();
  });

  it('does nothing when no main content element is present', () => {
    expect(() => focusMainContent()).not.toThrow();
  });
});
