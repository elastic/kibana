/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { AggTypesDependencies } from '..';
/**
 * @returns true if response is abort
 */
export declare const isAbortResponse: (
  response?:
    | IKibanaSearchResponse
    | {
        response: IKibanaSearchResponse;
      }
) => response is undefined;
/**
 * @returns true if request is still running
 */
export declare const isRunningResponse: (response?: IKibanaSearchResponse) => boolean;
export declare const getUserTimeZone: (
  getConfig: AggTypesDependencies['getConfig'],
  shouldDetectTimezone?: boolean
) => string;
export declare function strategyToString(strategy?: string | symbol): string;
