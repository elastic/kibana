/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import { action } from '@storybook/addon-actions';
import { KibanaErrorService } from '../../src/services/error_service';
import { KibanaErrorBoundaryServices } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Params {}

export class KibanaErrorBoundaryStorybookMock extends AbstractStorybookMock<
  {},
  KibanaErrorBoundaryServices
> {
  propArguments = {};

  serviceArguments = {};

  dependencies = [];

  getServices(params: Params = {}): KibanaErrorBoundaryServices {
    const reloadWindowAction = action('Reload window');
    const reloadWindow = () => {
      reloadWindowAction();
    };

    return {
      ...params,
      reloadWindow,
      errorService: new KibanaErrorService(),
    };
  }

  getProps(params: Params) {
    return params;
  }
}
