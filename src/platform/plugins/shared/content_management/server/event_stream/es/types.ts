/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';

export type EsClient = Omit<
  Client,
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;

/**
 * Represents a single event as it is stored in Elasticsearch.
 */
export interface EsEventStreamEventDto {
  /**
   * Time when the event occurred.
   */
  '@timestamp': string;

  /**
   * Type of the subject. Subject is the content item who/which performed the
   * event.
   */
  subjectType?: string;

  /**
   * ID of the subject.
   */
  subjectId?: string;

  /**
   * Type of the object. Object is the content item on which the event was
   * performed.
   */
  objectType?: string;

  /**
   * ID of the object.
   */
  objectId?: string;

  /**
   * Specifies the event type. Such as `create`, `update`, `delete`, etc.
   */
  predicate: string;

  /**
   * Custom payload, maybe be different per event type. Provided by the
   * event type originator.
   */
  payload?: Record<string, unknown>;

  /**
   * Transaction ID which allows to trace the event back to the original
   * request or to correlate multiple events. For example, one user action
   * can result in multiple events, all of which will have the same `txId`.
   */
  txId?: string;

  /**
   * Reserved for future extensions. Custom metadata may be added here by the
   * Event Stream implementation.
   */
  meta?: Record<string, unknown>;

  /**
   * Reserved for future extensions. Same as `meta`, but indexed.
   */
  indexed?: Record<string, unknown>;
}
