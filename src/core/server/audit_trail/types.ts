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
 * Audit event schema using ECS format.
 * https://www.elastic.co/guide/en/ecs/1.5/index.html
 * @public
 */
export interface AuditEvent {
  /**
   * Human readable message describing action, outcome and user.
   *
   * @example
   * User 'jdoe' updated saved object 'kpis' (dashboard)
   */
  message: string;
  event: {
    action: string;
    category?: EventCategory;
    type?: EventType;
    outcome?: EventOutcome;
    module?: string;
    dataset?: string;
  };
  user?: {
    name: string;
    email?: string;
    full_name?: string;
    hash?: string;
    roles?: readonly string[];
  };
  session?: {
    id: string;
  };
  kibana: {
    /**
     * Current space id of the request.
     */
    space_id?: string;
    /**
     * Saved object that was created, changed, deleted or accessed as part of the action.
     */
    saved_object?: {
      type: string;
      id?: string;
    };
    /**
     * Array of spaces added to the saved object.
     */
    add_to_spaces?: readonly string[];
    /**
     * Array of spaces removed from the saved object.
     */
    delete_from_spaces?: readonly string[];
    /**
     * Name of the authentication provider used.
     */
    authentication_provider?: string;
    /**
     * Type of the authentication provider used.
     */
    authentication_type?: string;
    /**
     * Realm used for user authentication.
     */
    authentication_realm?: string;
    /**
     * Realm used to lookup user details.
     */
    lookup_realm?: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
  http?: {
    request?: {
      method?: string;
      body?: {
        content: string;
      };
    };
    response?: {
      status_code?: number;
    };
  };
  url?: {
    domain?: string;
    full?: string;
    path?: string;
    port?: number;
    query?: string;
    scheme?: string;
  };
  trace: {
    /**
     * Corolation id extracted from request.
     */
    id: string;
  };
}

export type EventCategory = 'database' | 'web' | 'iam' | 'authentication' | 'process';
export type EventType = 'user' | 'group' | 'creation' | 'access' | 'change' | 'deletion';
export type EventOutcome = 'success' | 'failure' | 'unknown';

export type AuditEventDecorator<Args = undefined> = (
  event: Pick<AuditEvent, 'user' | 'trace' | 'kibana'>,
  args: Args
) => AuditEvent;

/**
 * Logs audit events scoped to the current request.
 * @public
 */
export interface Auditor {
  /**
   * Adds an event performed by the user to the audit log.
   *
   * @example
   * ```typescript
   * context.core.auditor.add((event) => ({
   *   ...event,
   *   message: `User '${event.user.name}' updated saved object 'kpis' of type 'dashboard'`,
   *   event: {
   *     action: 'saved_object_update',
   *     category: 'database',
   *     type: 'change',
   *     outcome: 'success'
   *   }
   * }));
   * ```
   */
  add<Args>(decorateEvent: AuditEventDecorator<Args>, args: Args): void;
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
