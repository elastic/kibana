/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogMeta } from '@kbn/logging';

/**
 * Audit kibana schema using ECS format
 */
export interface AuditKibana {
  /**
   * The ID of the space associated with this event.
   */
  space_id?: string;
  /**
   * The ID of the user session associated with this event. Each login attempt
   * results in a unique session id.
   */
  session_id?: string;
  /**
   * Saved object that was created, changed, deleted or accessed as part of this event.
   */
  saved_object?: {
    type: string;
    id: string;
    name?: string;
  };
  /**
   * Name of authentication provider associated with a login event.
   */
  authentication_provider?: string;
  /**
   * Type of authentication provider associated with a login event.
   */
  authentication_type?: string;
  /**
   * Name of Elasticsearch realm that has authenticated the user.
   */
  authentication_realm?: string;
  /**
   * Name of Elasticsearch realm where the user details were retrieved from.
   */
  lookup_realm?: string;
  /**
   * Set of space IDs that a saved object was shared to.
   */
  add_to_spaces?: readonly string[];
  /**
   * Set of space IDs that a saved object was removed from.
   */
  delete_from_spaces?: readonly string[];
  /**
   * Set of space IDs that are not authorized for an action.
   */
  unauthorized_spaces?: readonly string[];
  /**
   * Set of types that are not authorized for an action.
   */
  unauthorized_types?: readonly string[];
}

type EcsHttp = Required<LogMeta>['http'];
type EcsRequest = Required<EcsHttp>['request'];

/**
 * Audit request schema using ECS format
 */
export interface AuditRequest extends EcsRequest {
  /**
   * HTTP request headers
   */
  headers?: {
    'x-forwarded-for'?: string;
  };
}

/**
 * Audit http schema using ECS format
 */
export interface AuditHttp extends EcsHttp {
  /**
   * HTTP request details
   */
  request?: AuditRequest;
}

/**
 * Audit event schema using ECS format: https://www.elastic.co/guide/en/ecs/1.12/index.html
 *
 * If you add additional fields to the schema ensure you update the Kibana Filebeat module:
 * https://github.com/elastic/beats/tree/master/filebeat/module/kibana
 *
 * @public
 */
export interface AuditEvent extends LogMeta {
  /**
   * Log message
   */
  message: string;

  /**
   * Kibana specific fields
   */
  kibana?: AuditKibana;

  /**
   * Fields describing an HTTP request
   */
  http?: AuditHttp;
}
