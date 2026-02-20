/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GrantAPIKeyResult, InvalidateAPIKeyResult } from '../api_keys';
import type { GrantUiamAPIKeyParams, InvalidateUiamAPIKeyParams } from './uiam_api_keys';

/**
 * Public UIAM API Keys service exposed through core context to manage
 * UIAM-specific API key operations, including granting and invalidating
 * API keys through the UIAM service.
 */
export interface UiamAPIKeysWithContextType {
  /**
   * Grants an API key via the UIAM service.
   *
   * @param params The parameters for creating the API key (name and optional expiration).
   * @returns A promise that resolves to a GrantAPIKeyResult object containing the API key details, or null if the license is not enabled.
   * @throws {Error} If the request does not contain an authorization header or if the credential is not a UIAM credential.
   */
  grant(params: GrantUiamAPIKeyParams): Promise<GrantAPIKeyResult | null>;

  /**
   * Invalidates an API key via the UIAM service.
   *
   * @param params The parameters containing the ID of the API key to invalidate.
   * @returns A promise that resolves to an InvalidateAPIKeyResult object indicating the result of the operation, or null if the license is not enabled.
   * @throws {Error} If the request does not contain an authorization header or if the credential is not a UIAM credential.
   */
  invalidate(params: InvalidateUiamAPIKeyParams): Promise<InvalidateAPIKeyResult | null>;
}
