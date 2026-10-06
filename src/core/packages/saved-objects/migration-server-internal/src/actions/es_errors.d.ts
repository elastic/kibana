/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
export declare const isWriteBlockException: (errorCause?: ErrorCause) => boolean;
export declare const isIncompatibleMappingException: (errorCause?: ErrorCause) => boolean;
export declare const isIndexNotFoundException: (errorCause?: ErrorCause) => boolean;
export declare const isUnavailableShardsException: (errorCause?: ErrorCause) => boolean;
export declare const isClusterShardLimitExceeded: (errorCause?: ErrorCause) => boolean;
export declare const hasAllKeywordsInOrder: (
  message: string | null | undefined,
  keywords: string[]
) => boolean;
