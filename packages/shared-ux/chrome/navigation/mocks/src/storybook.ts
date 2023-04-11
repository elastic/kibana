/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import { SerializableRecord } from '@kbn/utility-types';
import { action } from '@storybook/addon-actions';
import { BehaviorSubject } from 'rxjs';
import { getLocatorNavigation } from '../../src/services';
import { NavigationProps, NavigationServices } from '../../types';
import { GetLocatorFn } from '../../types/internal';

type Arguments = NavigationProps & NavigationServices;
export type Params = Pick<
  Arguments,
  'navIsOpen' | 'recentItems' | 'activeNavItemId' | 'platformConfig' | 'solutions'
> &
  Arguments['platformConfig'];

export class StorybookMock extends AbstractStorybookMock<NavigationProps, NavigationServices> {
  propArguments = {};

  serviceArguments = {
    navIsOpen: {
      control: 'boolean',
      defaultValue: true,
    },
  };

  dependencies = [];

  getServices(params: Params): NavigationServices {
    const { navIsOpen, recentItems } = params;

    const navAction = action('Navigate to');
    const activeNavItemIdAction = action('Set active item');

    const getLocator: GetLocatorFn = (locatorId: string) => ({
      navigateSync: (locatorParams?: SerializableRecord) => {
        navAction(`Locator: ${locatorId} / Params: ${JSON.stringify(locatorParams)}`);
      },
    });

    const activeNavItemId$ = new BehaviorSubject(params.activeNavItemId ?? '');
    const setActiveNavItemId = (id: string) => {
      activeNavItemId$.next(id);
      activeNavItemIdAction(id);
    };

    const locatorNavigation = getLocatorNavigation(getLocator, setActiveNavItemId);

    return {
      activeNavItemId$,
      locatorNavigation,
      navIsOpen,
      recentItems,
    };
  }

  getProps(params: Params): NavigationProps {
    const { activeNavItemId: initiallyOpenSections } = params;
    return {
      ...params,
      activeNavItemId: initiallyOpenSections,
      homeHref: '#',
    };
  }
}
