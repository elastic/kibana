/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AlertHit } from '@kbn/alerting-plugin/server/types';

export interface AlertSelection {
  _id: string;
  _index: string;
}

/**
 * Query-based selection used to expand a trigger event on the server instead of
 * enumerating ids on the client. The server pages the query (PIT + search_after),
 * capped by a maxDocs limit, to build the trigger event. This keeps the request
 * payload tiny even when the selection spans thousands of documents.
 */
export interface EventQuerySelection {
  /** Elasticsearch DSL query describing the selected documents/alerts. */
  query: QueryDslQueryContainer;
  /** Index (pattern) or indices to search. */
  index: string | string[];
}

export interface AlertTriggerInput {
  event: {
    triggerType: 'alert';
    /** Explicit id selection, expanded server-side via mget. */
    alertIds?: AlertSelection[];
    /** Query-based selection expanded server-side. Mutually exclusive with `alertIds`. */
    querySelection?: EventQuerySelection;
    /** Optional rule type ids, carried for context/telemetry. */
    ruleTypeIds?: string[];
  };
}

export interface AlertEventRule {
  id: string;
  name: string;
  tags: string[];
  consumer: string;
  producer: string;
  ruleTypeId: string;
}

export interface AlertEvent {
  alerts: AlertHit[];
  rule: AlertEventRule;
  ruleUrl?: string;
  spaceId: string;
}
