/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { MaybePromise } from '@kbn/utility-types';

/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomBrandingStart {}

export type CustomBrandingFetchFn = (
  request: KibanaRequest,
  unauthenticated?: boolean
) => MaybePromise<CustomBranding>;

/** @public */
export interface CustomBrandingSetup {
  register: (fetchFn: CustomBrandingFetchFn) => void;
}
