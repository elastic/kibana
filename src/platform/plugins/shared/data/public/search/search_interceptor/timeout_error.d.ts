/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ApplicationStart } from '@kbn/core/public';
import { KbnError } from '@kbn/kibana-utils-plugin/common';
export declare enum TimeoutErrorMode {
  CONTACT = 0,
  CHANGE = 1,
}
/**
 * Request Failure - When an entire multi request fails
 * @param {Error} err - the Error that came back
 */
export declare class SearchTimeoutError extends KbnError {
  mode: TimeoutErrorMode;
  constructor(err: Record<string, any>, mode: TimeoutErrorMode);
  private getMessage;
  private getActionText;
  private onClick;
  getErrorMessage(application: ApplicationStart): React.JSX.Element;
}
