/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Core's UIAM service
 *
 * @public
 */
export interface CoreUiamService {
  /**
   * A UIAM shared secret should always be provided with UIAM internal credentials via the `x-client-authentication`
   * HTTP header if the credentials are primary, and via `es-secondary-x-client-authentication` if they are secondary.
   */
  readonly sharedSecret: string;
}
