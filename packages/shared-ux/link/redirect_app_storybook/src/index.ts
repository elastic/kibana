/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { AbstractStorybookMocks } from '@kbn/shared-ux-storybook-mocks';
import { RedirectAppLinksServices } from '@kbn/shared-ux-link-redirect-app-types';

class StorybookMocks extends AbstractStorybookMocks<{}, RedirectAppLinksServices> {
  propArguments = {};
  serviceArguments = {};
  dependencies = [];

  getServices() {
    return {
      navigateToUrl: action('navigateToUrl'),
      currentAppId: 'currentAppId',
    };
  }
}

export const RedirectAppLinksStorybookMocks = new StorybookMocks();
