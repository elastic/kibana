/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import { RedirectAppLinksStorybookMock } from '@kbn/shared-ux-link-redirect-app-mocks';
import type { NoDataCardServices, NoDataCardProps } from '@kbn/shared-ux-card-no-data-types';

type PropArguments = Pick<NoDataCardProps, 'category' | 'title' | 'description' | 'button'>;
type ServiceArguments = Pick<NoDataCardServices, 'canAccessFleet' | 'customBranding'>;
type Arguments = PropArguments & ServiceArguments;

/**
 * Storybook parameters provided from the controls addon.
 */
export type Params = Record<keyof Arguments, any>;

const redirectMock = new RedirectAppLinksStorybookMock();

/**
 * Storybook mocks for the `NoDataCard` component.
 */
export class StorybookMock extends AbstractStorybookMock<
  NoDataCardProps,
  NoDataCardServices,
  PropArguments,
  ServiceArguments
> {
  propArguments = {
    category: {
      control: {
        type: 'text',
      },
      defaultValue: '',
    },
    title: {
      control: {
        type: 'text',
      },
      defaultValue: '',
    },
    description: {
      control: {
        type: 'text',
      },
      defaultValue: '',
    },
    button: {
      control: {
        type: 'text',
      },
      defaultValue: '',
    },
  };

  serviceArguments = {
    canAccessFleet: {
      control: 'boolean',
      defaultValue: true,
    },
    customBranding: {
      hasCustomBranding: {
        control: 'boolean',
        defaultValue: false,
      },
    },
  };

  dependencies = [redirectMock];

  getProps(params?: Params): NoDataCardProps {
    return {
      category: this.getArgumentValue('category', params),
      title: this.getArgumentValue('title', params),
      description: this.getArgumentValue('description', params),
      button: this.getArgumentValue('button', params),
    };
  }

  getServices(params: Params): NoDataCardServices {
    const { canAccessFleet, customBranding } = params;

    return {
      canAccessFleet,
      customBranding: { hasCustomBranding: customBranding.hasCustomBranding },
      addBasePath: (path) => {
        action('addBasePath')(path);
        return path;
      },
      ...redirectMock.getServices(),
    };
  }
}
