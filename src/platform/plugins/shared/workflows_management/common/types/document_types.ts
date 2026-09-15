/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export interface DocumentSelection {
  _id: string;
  _index: string;
}

/**
 * Query-based selection used to expand a trigger event on the server instead of
 * enumerating ids on the client. The server pages the query using a point in time and
 * `search_after`, capped by a maxDocs limit, to build the trigger event. This keeps the
 * request payload tiny even when the selection spans thousands of documents.
 */
export interface EventQuerySelection {
  /** Elasticsearch DSL query describing the selected documents. */
  query: QueryDslQueryContainer;
  /** Index (pattern) or indices to search. */
  index: string | string[];
}

/** A single document as exposed to a workflow via the `document` trigger event. */
export interface DocumentEventEntry {
  id: string | undefined;
  index: string | undefined;
  timestamp: unknown;
  data: Record<string, unknown>;
}

/**
 * Input contract for the `document` trigger. A caller may supply exactly one of:
 * - `documents`: pre-expanded documents (legacy / standalone forms), passed through as-is.
 * - `documentIds`: explicit id selection, expanded server-side via mget.
 * - `querySelection`: a query, expanded server-side using a point in time and `search_after`.
 */
export interface DocumentTriggerInput {
  event: {
    triggerType: 'document';
    /** Pre-expanded documents. When present, server-side expansion is skipped. */
    documents?: DocumentEventEntry[];
    /** Explicit id selection, expanded server-side via mget. */
    documentIds?: DocumentSelection[];
    /** Query-based selection expanded server-side. */
    querySelection?: EventQuerySelection;
    /** Informational KQL/submitted query string, passed through to the workflow. */
    query?: string;
    /** Data view title, passed through to the workflow. */
    dataView?: string;
  };
}
