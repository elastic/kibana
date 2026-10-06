/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ApiDeprecationDetails,
  DomainDeprecationDetails,
} from '@kbn/core-deprecations-common';
import type { PostValidationMetadata } from '@kbn/core-http-server';
import type { BuildApiDeprecationDetailsParams } from '../types';
export declare const getIsRouteApiDeprecation: ({
  isInternalApiRequest,
  deprecated,
}: PostValidationMetadata) => boolean;
export declare const buildApiRouteDeprecationDetails: ({
  apiUsageStats,
  deprecatedApiDetails,
  docLinks,
}: BuildApiDeprecationDetailsParams) => DomainDeprecationDetails<ApiDeprecationDetails>;
