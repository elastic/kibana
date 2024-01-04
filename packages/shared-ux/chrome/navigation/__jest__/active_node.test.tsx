/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './setup_jest_mocks';
import React from 'react';
import { type RenderResult, act } from '@testing-library/react';
import { of, BehaviorSubject } from 'rxjs';
import type {
  ChromeProjectNavigation,
  ChromeProjectNavigationNode,
} from '@kbn/core-chrome-browser';

import { Navigation } from '../src/ui/components/navigation';
import type { RootNavigationItemDefinition } from '../src/ui/types';
import { NavigationServices } from '../types';
import { renderNavigation, errorHandler, TestType } from './utils';

describe('Active node', () => {
  test('should set the active node', async () => {
    const deepLinks$: NavigationServices['deepLinks$'] = of({
      item1: {
        id: 'item1',
        title: 'Item 1',
        baseUrl: '',
        url: '',
        href: '',
      },
      item2: {
        id: 'item2',
        title: 'Item 2',
        baseUrl: '',
        url: '',
        href: '',
      },
    });

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

    const runTests = async (type: TestType, { findByTestId }: RenderResult) => {
      try {
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
      } catch (e) {
        errorHandler(type)(e);
      }
    };

    // -- Default navigation
    {
      const navigationBody: Array<RootNavigationItemDefinition<any>> = [
        {
          type: 'navGroup',
          id: 'group1',
          children: [
            { link: 'item1', title: 'Item 1' },
            { link: 'item2', title: 'Item 2' },
          ],
        },
      ];

      const renderResult = renderNavigation({
        navTreeDef: { body: navigationBody },
        services: { deepLinks$, activeNodes$: getActiveNodes$() },
      });

      await runTests('treeDef', renderResult);

      renderResult.unmount();
    }

    // -- With UI Components
    {
      const renderResult = renderNavigation({
        navigationElement: (
          <Navigation>
            <Navigation.Group id="group1">
              <Navigation.Item<any> link="item1" title="Item 1" />
              <Navigation.Item<any> link="item2" title="Item 2" />
            </Navigation.Group>
          </Navigation>
        ),
        services: { deepLinks$, activeNodes$: getActiveNodes$() },
      });

      await runTests('uiComponents', renderResult);
    }
  });

  test('should override the URL location to set the active node', async () => {
    const deepLinks$: NavigationServices['deepLinks$'] = of({
      item1: {
        id: 'item1',
        title: 'Item 1',
        baseUrl: '',
        url: '',
        href: '',
      },
    });

    let activeNodes$: BehaviorSubject<ChromeProjectNavigationNode[][]>;

    const getActiveNodes$ = () => {
      activeNodes$ = new BehaviorSubject<ChromeProjectNavigationNode[][]>([]);

      return activeNodes$;
    };

    const onProjectNavigationChange = (nav: ChromeProjectNavigation) => {
      nav.navigationTree.forEach((node) => {
        node.children?.forEach((child) => {
          if (child.getIsActive?.({} as any)) {
            activeNodes$.next([[child]]);
          }
        });
      });
    };

    const runTests = async (type: TestType, { findByTestId }: RenderResult) => {
      try {
        expect((await findByTestId(/nav-item-group1.item1/)).dataset.testSubj).toMatch(
          /nav-item-isActive/
        );
      } catch (e) {
        errorHandler(type)(e);
      }
    };

    // -- Default navigation
    {
      const navigationBody: Array<RootNavigationItemDefinition<any>> = [
        {
          type: 'navGroup',
          id: 'group1',
          children: [
            {
              link: 'item1',
              title: 'Item 1',
              getIsActive: () => {
                return true; // Always active
              },
            },
          ],
        },
      ];

      const renderResult = renderNavigation({
        navTreeDef: { body: navigationBody },
        services: { deepLinks$, activeNodes$: getActiveNodes$() },
        onProjectNavigationChange,
      });

      await runTests('treeDef', renderResult);

      renderResult.unmount();
    }

    // -- With UI Components
    {
      const renderResult = renderNavigation({
        navigationElement: (
          <Navigation>
            <Navigation.Group id="group1">
              <Navigation.Item<any>
                link="item1"
                title="Item 1"
                getIsActive={() => {
                  return true;
                }}
              />
            </Navigation.Group>
          </Navigation>
        ),
        onProjectNavigationChange,
        services: { deepLinks$, activeNodes$: getActiveNodes$() },
      });

      await runTests('uiComponents', renderResult);
    }
  });
});
