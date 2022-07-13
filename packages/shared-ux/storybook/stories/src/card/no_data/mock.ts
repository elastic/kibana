/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { AbstractStorybookMock, StorybookMockServiceParams } from '@kbn/shared-ux-storybook-mock';
import type { NoDataCardServices, NoDataCardProps } from '@kbn/shared-ux-card-no-data';

import { RedirectAppLinksStorybookMock } from '../../link/redirect_app';

export type NoDataCardParams = StorybookMockServiceParams<NoDataCardProps, NoDataCardServices>;

export class StorybookMock extends AbstractStorybookMock<NoDataCardProps, NoDataCardServices> {
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
  };

  dependencies = [RedirectAppLinksStorybookMock];

  getServices(params: NoDataCardParams): NoDataCardServices {
    return {
      ...params,
      addBasePath: (path) => {
        action('addBasePath')(path);
        return path;
      },
    };
  }
}

export const NoDataCardStorybookMock = new StorybookMock();
