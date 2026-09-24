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
          id: 'list',
          visibleIn: ['globalSearch', 'projectSideNav'],
        }),
        expect.objectContaining({
          id: 'library',
          visibleIn: ['globalSearch', 'projectSideNav'],
        }),
      ])
    );
  });

  it('includes projectSideNav on the executions deep link so solution nav does not strip it', () => {
    const deepLinks = getDeepLinks({ executionsViewEnabled: true });

    expect(deepLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'executions',
          path: '/executions',
          visibleIn: ['globalSearch', 'projectSideNav'],
        }),
      ])
    );
  });

  it('orders Executions before Template Library when both are enabled', () => {
    const deepLinks = getDeepLinks({ executionsViewEnabled: true, libraryEnabled: true });

    expect(deepLinks.map((link) => link.id)).toEqual(['list', 'executions', 'library']);
  });

  it('does not set visibleIn on the workflows deep link when the library is disabled', () => {
    const [workflowsDeepLink] = getDeepLinks({ libraryEnabled: false });

    expect(workflowsDeepLink).toEqual(expect.objectContaining({ id: 'list', path: '/' }));
    expect(workflowsDeepLink.visibleIn).toBeUndefined();
  });

  it('includes projectSideNav in visibleIn for the executions deep link when executionsViewEnabled', () => {
    const deepLinks = getDeepLinks({ executionsViewEnabled: true });
    const executionsLink = deepLinks.find((l) => l.id === 'executions');

    expect(executionsLink).toEqual(
      expect.objectContaining({
        id: 'executions',
        visibleIn: ['globalSearch', 'projectSideNav'],
      })
    );
  });

  it('omits the executions deep link when executionsViewEnabled is false', () => {
    const deepLinks = getDeepLinks({ executionsViewEnabled: false });

    expect(deepLinks.find((l) => l.id === 'executions')).toBeUndefined();
  });
});
