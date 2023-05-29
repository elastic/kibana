/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import { action } from '@storybook/addon-actions';
import { BehaviorSubject } from 'rxjs';
import { ChromeNavigationViewModel, NavigationServices } from '../../types';

type Arguments = ChromeNavigationViewModel & NavigationServices;
export type Params = Pick<
  Arguments,
  | 'activeNavItemId'
  | 'loadingCount$'
  | 'navIsOpen'
  | 'navigationTree'
  | 'platformConfig'
  | 'recentlyAccessed$'
  | 'recentlyAccessedFilter'
>;

export class StorybookMock extends AbstractStorybookMock<
  ChromeNavigationViewModel,
  NavigationServices
> {
  propArguments = {};

  serviceArguments = {
    navIsOpen: {
      control: 'boolean',
      defaultValue: true,
    },
  };

  dependencies = [];

  getServices(params: Params): NavigationServices {
    const navAction = action('Navigate to');
    const navigateToUrl = (url: string) => {
      navAction(url);
      return Promise.resolve();
    };

    return {
      ...params,
      basePath: { prepend: (suffix: string) => `/basepath${suffix}` },
      navigateToUrl,
      loadingCount$: params.loadingCount$ ?? new BehaviorSubject(0),
      recentlyAccessed$: params.recentlyAccessed$ ?? new BehaviorSubject([]),
    };
  }

  getProps(params: Params): ChromeNavigationViewModel {
    return {
      ...params,
      homeHref: '#',
      linkToCloud: 'projects',
      recentlyAccessedFilter: params.recentlyAccessedFilter,
    };
  }
}
