/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiGlobalToastListProps } from '@elastic/eui';
import { ErrorService } from './src/services/error_service';
import { ToastsService } from './src/services/toasts_service';

export interface ErrorBoundaryUIServices {
  reloadWindow: () => void;
}

export type Toasts = EuiGlobalToastListProps['toasts'];

/**
 * Services that are consumed internally in this component.
 * @internal
 */
export interface ErrorBoundaryServices extends ErrorBoundaryUIServices {
  errorService: ErrorService;
  toastsService: ToastsService;
}

/**
 * Kibana dependencies required to render this component.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ErrorBoundaryKibanaDependencies {
  // TODO analytics
}
