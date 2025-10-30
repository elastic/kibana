/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { action } from '@storybook/addon-actions';
import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import type { NoDataCardServices, NoDataCardProps } from '@kbn/shared-ux-card-no-data-types';

type PropArguments = Pick<
  NoDataCardProps,
  | 'title'
  | 'description'
  | 'buttonText'
  | 'href'
  | 'docsLink'
  | 'canAccessFleet'
  | 'disabledButtonTooltipText'
  | 'data-test-subj'
>;
type ServiceArguments = Pick<NoDataCardServices, 'canAccessFleet'>;
type Arguments = PropArguments & ServiceArguments;

/**
 * Storybook parameters provided from the controls addon.
 */
export type Params = Record<keyof Arguments, any>;

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
    title: {
      control: {
        control: 'text',
      },
      defaultValue: '',
    },
    description: {
      control: {
        control: 'text',
      },
      defaultValue: '',
    },
    buttonText: {
      control: {
        control: 'text',
      },
      defaultValue: '',
    },
    href: {
      control: {
        control: 'text',
      },
      defaultValue: '',
    },
    docsLink: {
      control: {
        control: 'text',
      },
      defaultValue: '',
    },
    canAccessFleet: {
      control: {
        control: 'boolean',
      },
      defaultValue: true,
    },
    disabledButtonTooltipText: {
      control: {
        control: 'text',
      },
      defaultValue: '',
    },
  };

  serviceArguments = {
    canAccessFleet: {
      control: { control: 'boolean' },
      defaultValue: true,
    },
  };

  dependencies = [];

  getProps(params?: Params): NoDataCardProps {
    return {
      title: this.getArgumentValue('title', params),
      description: this.getArgumentValue('description', params),
      buttonText: this.getArgumentValue('buttonText', params),
      canAccessFleet: this.getArgumentValue('canAccessFleet', params),
      href: this.getArgumentValue('href', params),
      docsLink: this.getArgumentValue('docsLink', params),
      disabledButtonTooltipText: this.getArgumentValue('disabledButtonTooltipText', params),
    };
  }

  getServices(params: Params): NoDataCardServices {
    // Use canAccessFleet from params, defaulting to true if not provided
    const canAccessFleet = params?.canAccessFleet !== undefined ? params.canAccessFleet : true;

    return {
      canAccessFleet,
      addBasePath: (path) => {
        action('addBasePath')(path);
        return path;
      },
    };
  }
}
