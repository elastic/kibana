/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';
import type { APIKeysType, AuditLogger as IAuditLogger } from '@kbn/core-security-server';
import type { AuthenticatedUser } from '@kbn/core-security-common';

/**
 * The audit logger scoped to the current HTTP request.
 * @see {@link IAuditLogger}
 * @public
 */
export const AuditLogger = Symbol('AuditLogger') as ServiceIdentifier<IAuditLogger>;

/**
 * The user authenticated for the current HTTP request or `null` if the request is not authenticated.
 * @see {@link AuthenticatedUser}
 * @public
 */
export const CurrentUser = Symbol('CurrentUser') as ServiceIdentifier<AuthenticatedUser | null>;

/**
 * The service for managing API keys.
 * @see {@link APIKeysType}
 * @public
 */
export const ApiKeys = Symbol('ApiKeys') as ServiceIdentifier<APIKeysType>;
