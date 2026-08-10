/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InvalidateAPIKeyResult } from '../authentication/api_keys/api_keys';

const UIAM_API_KEY_MISSING_CODE = '0x28D520';
const UIAM_API_KEY_REVOKED_CODE = '0xD38358';

/**
 * Checks whether the UIAM invalidation response indicates the API key no longer exists.
 */
export const isMissingApiKey = (response: InvalidateAPIKeyResult | null): boolean =>
  response?.error_details?.some((d) => d.code === UIAM_API_KEY_MISSING_CODE) ?? false;

/**
 * Checks whether the UIAM invalidation response indicates the API key was already revoked.
 */
export const isRevokedApiKey = (response: InvalidateAPIKeyResult | null): boolean =>
  response?.error_details?.some((d) => d.code === UIAM_API_KEY_REVOKED_CODE) ?? false;
