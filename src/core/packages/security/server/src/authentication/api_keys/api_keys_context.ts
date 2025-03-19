/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CreateAPIKeyParams,
  CreateAPIKeyResult,
  UpdateAPIKeyParams,
  UpdateAPIKeyResult,
  ValidateAPIKeyParams,
  InvalidateAPIKeyResult,
  InvalidateAPIKeysParams,
} from './api_keys';

/**
 * Public API Keys service exposed through core context to manage
 * API keys in Elasticsearch, including creation,
 * validation, and invalidation of API keys,
 * as well as checking the status of API key features.
 */
export interface APIKeysServiceWithContext {
  /**
   * Determines if API Keys are enabled in Elasticsearch.
   */
  areAPIKeysEnabled(): Promise<boolean>;

  /**
   * Tries to create an API key for the current user.
   *
   * Returns newly created API key or `null` if API keys are disabled.
   *
   * User needs `manage_api_key` privilege to create REST API keys and `manage_security` for Cross-Cluster API keys.
   *
   * @param createParams The params to create an API key
   */
  create(createParams: CreateAPIKeyParams): Promise<CreateAPIKeyResult | null>;

  /**
   * Attempts update an API key with the provided 'role_descriptors' and 'metadata'
   *
   * Returns `updated`, `true` if the update was successful, `false` if there was nothing to update
   *
   * User needs `manage_api_key` privilege to update REST API keys and `manage_security` for cross-cluster API keys.
   *
   * @param updateParams The params to edit an API key
   */
  update(updateParams: UpdateAPIKeyParams): Promise<UpdateAPIKeyResult | null>;

  /**
   * Tries to validate an API key.
   * @param apiKeyPrams ValidateAPIKeyParams.
   */
  validate(apiKeyPrams: ValidateAPIKeyParams): Promise<boolean>;

  /**
   * Tries to invalidate an API keys.
   * @param params The params to invalidate an API keys.
   */
  invalidate(params: InvalidateAPIKeysParams): Promise<InvalidateAPIKeyResult | null>;
}
