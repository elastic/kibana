/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    const onClickRefresh = action('Reload window');
    const analytics = { reportEvent: action('Report telemetry event') };

    return {
      ...params,
      onClickRefresh,
      errorService: new KibanaErrorService({ analytics }),
    };
  }

  getProps(params: Params) {
    return params;
  }
}
