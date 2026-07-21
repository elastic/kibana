/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDeepLinks } from './deep_links';

describe('getDeepLinks', () => {
  it('excludes classicSideNav from library deep links to avoid flat hamburger menu entries', () => {
    const deepLinks = getDeepLinks({ libraryEnabled: true });

    expect(deepLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'workflows',
          visibleIn: ['globalSearch', 'projectSideNav'],
        }),
        expect.objectContaining({
          id: 'library',
          visibleIn: ['globalSearch', 'projectSideNav'],
        }),
      ])
    );
  });

  it('does not set visibleIn on the workflows deep link when the library is disabled', () => {
    const [workflowsDeepLink] = getDeepLinks({ libraryEnabled: false });

    expect(workflowsDeepLink).toEqual(expect.objectContaining({ id: 'workflows', path: '/' }));
    expect(workflowsDeepLink.visibleIn).toBeUndefined();
  });
});
