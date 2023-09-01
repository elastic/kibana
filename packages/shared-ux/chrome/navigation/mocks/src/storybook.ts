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
import { NavigationServices } from '../../types';

type Arguments = NavigationServices;
export type Params = Pick<
  Arguments,
  'navIsOpen' | 'recentlyAccessed$' | 'navLinks$' | 'onProjectNavigationChange'
>;

export class StorybookMock extends AbstractStorybookMock<{}, NavigationServices> {
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
      recentlyAccessed$: params.recentlyAccessed$ ?? new BehaviorSubject([]),
      navLinks$: params.navLinks$ ?? new BehaviorSubject([]),
      onProjectNavigationChange: params.onProjectNavigationChange ?? (() => undefined),
      activeNodes$: new BehaviorSubject([]),
      cloudLinks: {
        billingAndSub: {
          title: 'Billing & Subscriptions',
          href: 'https://cloud.elastic.co/account/billing',
        },
        performance: {
          title: 'Performance',
          href: 'https://cloud.elastic.co/deployments/123456789/performance',
        },
        userAndRoles: {
          title: 'Users & Roles',
          href: 'https://cloud.elastic.co/deployments/123456789/security/users',
        },
      },
    };
  }

  getProps(params: Params) {
    return params;
  }
}
