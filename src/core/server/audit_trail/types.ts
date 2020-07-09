/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { KibanaRequest } from '../http';

/**
 * Event to audit.
 * @public
 *
 * @remarks
 * Not a complete interface.
 */
export interface AuditableEvent {
  message: string;
  type: string;
}

/**
 * Provides methods to log user actions and access events.
 * @public
 */
export interface Auditor {
  /**
   * Add a record to audit log.
   * Service attaches to a log record:
   * - metadata about an end-user initiating an operation
   * - scope name, if presents
   *
   * @example
   * How to add a record in audit log:
   * ```typescript
   * router.get({ path: '/my_endpoint', validate: false }, async (context, request, response) => {
   *   context.core.auditor.withAuditScope('my_plugin_operation');
   *   const value = await context.core.elasticsearch.legacy.client.callAsCurrentUser('...');
   *   context.core.add({ type: 'operation.type', message: 'perform an operation in ... endpoint' });
   * ```
   */
  add(event: AuditableEvent): void;
  /**
   * Add a high-level scope name for logged events.
   * It helps to identify the root cause of low-level events.
   */
  withAuditScope(name: string): void;
}

/**
 * Creates {@link Auditor} instance bound to the current user credentials.
 * @public
 */
export interface AuditorFactory {
  asScoped(request: KibanaRequest): Auditor;
}

export interface AuditTrailSetup {
  /**
   * Register a custom {@link AuditorFactory} implementation.
   */
  register(auditor: AuditorFactory): void;
}

export type AuditTrailStart = AuditorFactory;
