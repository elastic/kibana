/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './setup_jest_mocks';
import { act } from '@testing-library/react';
import { of, BehaviorSubject } from 'rxjs';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { renderNavigation } from './utils';

describe('Active node', () => {
  test('should set the active node', async () => {
    let activeNodes$: BehaviorSubject<ChromeProjectNavigationNode[][]>;

    const getActiveNodes$ = () => {
      activeNodes$ = new BehaviorSubject([
        [
          {
            id: 'group1',
            title: 'Group 1',
            path: 'group1',
          },
          {
            id: 'item1',
            title: 'Item 1',
            path: 'group1.item1',
          },
        ],
      ]);

      return activeNodes$;
    };

    const visibleIn = ['globalSearch' as const];

    const navigationBody: ChromeProjectNavigationNode[] = [
      {
        id: 'group1',
        title: 'Group 1',
        path: 'group1',
        children: [
          {
            title: 'Item 1',
            id: 'item1',
            path: 'group1.item1',
            deepLink: {
              id: 'item1',
              title: 'Item 1',
              baseUrl: '',
              url: '',
              href: '',
              visibleIn,
            },
          },
          {
            title: 'Item 2',
            id: 'item2',
            path: 'group1.item2',
            deepLink: {
              id: 'item2',
              title: 'Item 2',
              baseUrl: '',
              url: '',
              href: '',
              visibleIn,
            },
          },
        ],
      },
    ];

    const { findByTestId } = renderNavigation({
      navTreeDef: of({ id: 'es', body: navigationBody }),
      services: { activeNodes$: getActiveNodes$() },
    });

    expect((await findByTestId(/nav-item-group1.item1/)).dataset.testSubj).toMatch(
      /nav-item-isActive/
    );
    expect((await findByTestId(/nav-item-group1.item2/)).dataset.testSubj).not.toMatch(
      /nav-item-isActive/
    );

    await act(async () => {
      activeNodes$.next([
        [
          {
            id: 'group1',
            title: 'Group 1',
            path: 'group1',
          },
          {
            id: 'item2',
            title: 'Item 2',
            path: 'group1.item2',
          },
        ],
      ]);
    });

    expect((await findByTestId(/nav-item-group1.item1/)).dataset.testSubj).not.toMatch(
      /nav-item-isActive/
    );
    expect((await findByTestId(/nav-item-group1.item2/)).dataset.testSubj).toMatch(
      /nav-item-isActive/
    );
  });
});
