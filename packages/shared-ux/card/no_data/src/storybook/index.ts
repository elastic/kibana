/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { AbstractStorybookMocks, Params } from '@kbn/shared-ux-storybook';
// @ts-expect-error Pending updates to how Bazel can package storybook and jest mocks.
import { RedirectAppLinksStorybookMocks } from '@kbn/shared-ux-link-redirect-app/target_node/storybook';
import type { NoDataCardServices } from '../services';
import type { Props } from '../no_data_card';

export type NoDataCardParams = Params<Props, NoDataCardServices>;

class StorybookMocks extends AbstractStorybookMocks<Props, NoDataCardServices> {
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

  dependencies = [RedirectAppLinksStorybookMocks];

  getServices(params: Params<Props, NoDataCardServices>): NoDataCardServices {
    return {
      ...params,
      addBasePath: (path) => {
        action('addBasePath')(path);
        return path;
      },
    };
  }
}

export const NoDataCardStorybookMocks = new StorybookMocks();
