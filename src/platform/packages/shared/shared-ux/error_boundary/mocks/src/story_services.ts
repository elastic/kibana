/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { action } from '@storybook/addon-actions';
import type { AnalyticsMock } from './analytics_mock';
import { createAnalyticsMock } from './analytics_mock';
import type { KibanaErrorBoundaryServices } from '../../types';
import { KibanaErrorService } from '../../src/services/error_service';

export function createServicesWithAnalyticsMock(): {
  services: KibanaErrorBoundaryServices;
  mock: AnalyticsMock;
} {
  const onClickRefresh = action('Reload window');
  const mock = createAnalyticsMock();
  const analytics = mock.analytics;

  return {
    services: {
      onClickRefresh,
      errorService: new KibanaErrorService({ analytics }),
    },
    mock,
  };
}
