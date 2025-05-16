/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';

export const mappings: estypes.MappingTypeMapping = {
  dynamic: false,
  properties: {
    /**
     * Every document indexed to a data stream must contain a `@timestamp`
     * field, mapped as a `date` or `date_nanos` field type.
     */
    '@timestamp': {
      type: 'date',
    },

    /** Subject is the content item who/which performed the event. */
    subjectType: {
      type: 'keyword',
      ignore_above: 256,
    },
    subjectId: {
      type: 'keyword',
      ignore_above: 256,
    },

    /** Object is the content item on which the event was performed. */
    objectType: {
      type: 'keyword',
      ignore_above: 256,
    },
    objectId: {
      type: 'keyword',
      ignore_above: 256,
    },

    /** The event type. */
    predicate: {
      type: 'keyword',
      ignore_above: 256,
    },

    /** Custom payload, may be be different per event type. */
    payload: {
      type: 'object',
      enabled: false,
      dynamic: false,
    },

    /**
     * Transaction ID which allows to trace the event back to the original
     * request or to correlate multiple events. For example, one user action
     * can result in multiple events, all of which will have the same `txId`.
     */
    txId: {
      type: 'keyword',
      ignore_above: 256,
    },

    /**
     * Reserved for future extensions. Event Stream client can add custom
     * private fields here in the future if needed, without having to update
     * the index template mappings.
     */
    meta: {
      type: 'object',
      enabled: false,
      dynamic: false,
    },

    /**
     * Reserved for the future extensions, same as the `meta` field, but fields
     * added to this object will be indexed.
     *
     * See dynamic field mapping rules: https://www.elastic.co/guide/en/elasticsearch/reference/current/dynamic-field-mapping.html
     */
    indexed: {
      type: 'object',
      enabled: true,
      dynamic: true,
    },
  },
};
