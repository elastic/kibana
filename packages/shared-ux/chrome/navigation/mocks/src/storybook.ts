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
import { NavigationProps, NavigationServices } from '../../types';
import { getMockNavItems, mockLocatorId } from './nav_items';

type Arguments = NavigationProps & NavigationServices;
export type Params = Pick<Arguments, 'navIsOpen' | 'recentItems' | 'initiallyOpenSections'>;

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
    const navAction = action('Navigation');

    return {
      getLocator(_locatorId: string) {
        return {
          navigateSync(locatorParams?: SerializableRecord) {
            // show nav info with storybook add-on
            navAction(`Locator: ${mockLocatorId} / Params: ${JSON.stringify(locatorParams)}`);
          },
        };
      },
      navIsOpen,
      recentItems,
    };
  }

  getProps(params: Params): NavigationProps {
    const { initiallyOpenSections } = params;
    return {
      id: 'example_project',
      title: {
        name: 'Example Project',
        icon: 'logoObservability',
      },
      sections: {},
      items: getMockNavItems(),
      initiallyOpenSections,
    };
  }
}
