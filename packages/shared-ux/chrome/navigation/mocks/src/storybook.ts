/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import { action } from '@storybook/addon-actions';
import { NavigationProps, NavigationServices } from '../../types';

type Arguments = NavigationProps & NavigationServices;
export type Params = Pick<
  Arguments,
  'activeNavItemId' | 'loadingCount' | 'navIsOpen' | 'platformConfig' | 'solutions'
>;

export class StorybookMock extends AbstractStorybookMock<NavigationProps, NavigationServices> {
  propArguments = {};

  serviceArguments = {
    navIsOpen: {
      control: 'boolean',
      defaultValue: true,
    },
    loadingCount: {
      control: 'number',
      defaultValue: 0,
    },
  };

  dependencies = [];

  getServices(params: Params): NavigationServices {
    const { navIsOpen } = params;

    const navAction = action('Navigate to');
    const navigateToUrl = (url: string) => {
      navAction(url);
      return Promise.resolve();
    };

    return {
      ...params,
      basePath: { prepend: (suffix: string) => `/basepath${suffix}` },
      navigateToUrl,
      navIsOpen,
    };
  }

  getProps(params: Params): NavigationProps {
    return {
      ...params,
      homeHref: '#',
      linkToCloud: 'projects',
    };
  }
}
