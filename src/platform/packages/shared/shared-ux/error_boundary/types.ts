/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { KibanaErrorService } from './src/services/error_service';

/**
 * Services that are consumed internally in this component.
 * @internal
 */
export interface KibanaErrorBoundaryServices {
  onClickRefresh: () => void;
  errorService: KibanaErrorService;
}

/** @internal */
export interface BaseErrorBoundaryProps {
  services: KibanaErrorBoundaryServices;
}

/** @internal */
export interface BaseErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  componentName: string | null;
  isFatal: boolean | null;
}

/**
 * @public
 */
export interface KibanaErrorBoundaryProviderDeps {
  /**
   * Unused. Caught errors are reported to APM RUM only, not EBT.
   * Retained so existing call sites continue to type-check.
   * @deprecated
   */
  analytics?:
    | {
        reportEvent: (eventType: string, eventData: object) => void;
      }
    | undefined;
}
