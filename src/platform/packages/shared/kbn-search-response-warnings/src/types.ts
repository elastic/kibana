/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { estypes } from '@elastic/elasticsearch';

/**
 * A warning object for a search response with incomplete ES results
 * ES returns incomplete results when:
 * 1) Set timeout flag on search and the timeout expires on cluster
 * 2) Some shard failures on a cluster
 * 3) skipped remote(s) (skip_unavailable=true)
 *   a. all shards failed
 *   b. disconnected/not-connected
 * @public
 */
export interface SearchResponseIncompleteWarning {
  /**
   * type: for sorting out incomplete warnings
   */
  type: 'incomplete';
  /**
   * requestName: human-friendly request name
   */
  requestName: string;
  /**
   * clusters: cluster details.
   */
  clusters: Record<string, estypes.ClusterDetails>;
  /**
   * openInInspector: callback to open warning in inspector
   */
  openInInspector: () => void;
}

/**
 * A warning object for a search response with warnings
 * @public
 */
export type SearchResponseWarning = SearchResponseIncompleteWarning;

/**
 * A callback function which can intercept warnings when passed to {@link showWarnings}. Pass `true` from the
 * function to prevent the search service from showing warning notifications by default.
 * @public
 */
export type WarningHandlerCallback = (
  warning: SearchResponseWarning,
  meta: {
    request: estypes.SearchRequest;
    response: estypes.SearchResponse;
    requestId: string | undefined;
  }
) => boolean | undefined;
