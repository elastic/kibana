/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { IKibanaSearchResponse } from './types';

/**
 * @returns true if response had an error while executing in ES
 */
export const isErrorResponse = (response?: IKibanaSearchResponse) => {
  return !response || (!response.isRunning && response.isPartial);
};

/**
 * @returns true if response is completed successfully
 */
export const isCompleteResponse = (response?: IKibanaSearchResponse) => {
  return Boolean(response && !response.isRunning && !response.isPartial);
};

/**
 * @returns true if request is still running an/d response contains partial results
 */
export const isPartialResponse = (response?: IKibanaSearchResponse) => {
  return Boolean(response && response.isRunning && response.isPartial);
};
