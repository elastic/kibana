/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import { action } from '@storybook/addon-actions';
import { BehaviorSubject, of } from 'rxjs';
import { EventTracker } from '../src/analytics';
import { NavigationServices } from '../src/types';

type Arguments = NavigationServices;
export type Params = Pick<Arguments, 'isSideNavCollapsed' | 'recentlyAccessed$' | 'activeNodes$'>;

export class StorybookMock extends AbstractStorybookMock<{}, NavigationServices> {
  propArguments = {};

  serviceArguments = {
    isSideNavCollapsed: {
      control: 'boolean',
      defaultValue: false,
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
      basePath: { prepend: (suffix: string) => `/basepath${suffix}`, remove: () => '' },
      navigateToUrl,
      recentlyAccessed$: params.recentlyAccessed$ ?? new BehaviorSubject([]),
      activeNodes$: params.activeNodes$ ?? new BehaviorSubject([]),
      isSideNavCollapsed: true,
      eventTracker: new EventTracker({ reportEvent: action('Report event') }),
      isFeedbackBtnVisible$: of(false),
    };
  }

  getProps(params: Params) {
    return params;
  }
}
