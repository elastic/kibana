/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaErrorService } from './src/services/error_service';

/**
 * Services that are consumed internally in this component.
 * @internal
 */
export interface KibanaErrorBoundaryServices {
  onClickRefresh: () => void;
  errorService: KibanaErrorService;
}

/**
 * {analytics: AnalyticsServiceStart | undefined}
 * @public
 */
export interface KibanaErrorBoundaryProviderDeps {
  analytics:
    | {
        reportEvent: (eventType: string, eventData: object) => void;
      }
    | undefined;
}
