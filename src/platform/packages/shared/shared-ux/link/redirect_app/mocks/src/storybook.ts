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
import { RedirectAppLinksProps } from '@kbn/shared-ux-link-redirect-app-types';

export class StorybookMock extends AbstractStorybookMock<RedirectAppLinksProps, {}> {
  propArguments = {};
  serviceArguments = {};
  dependencies = [];

  getProps() {
    return {
      navigateToUrl: action('navigateToUrl'),
      currentAppId: 'currentAppId',
    };
  }

  getServices() {
    // This is an odd case, since the base component also populates services.
    return { ...this.getProps() };
  }
}
