/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ErrorService } from './src/services/error_service';

export interface ErrorBoundaryUIServices {
  reloadWindow: () => void;
}

/**
 * Services that are consumed internally in this component.
 * @internal
 */
export interface ErrorBoundaryServices extends ErrorBoundaryUIServices {
  errorService: ErrorService;
}
