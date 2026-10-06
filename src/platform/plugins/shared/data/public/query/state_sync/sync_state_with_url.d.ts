/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { QuerySetup, QueryStart } from '../query_service';
/**
 * Helper to sync global query state {@link GlobalQueryStateFromUrl} with the URL (`_g` query param that is preserved between apps)
 * @param QueryService: either setup or start
 * @param kbnUrlStateStorage to use for syncing
 */
export declare const syncGlobalQueryStateWithUrl: (
  query: Pick<QueryStart | QuerySetup, 'filterManager' | 'timefilter' | 'queryString' | 'state$'>,
  kbnUrlStateStorage: IKbnUrlStateStorage
) => {
  stop: () => void;
  hasInheritedQueryFromUrl: boolean;
};
/**
 * @deprecated use {@link syncGlobalQueryStateWithUrl} instead
 */
export declare const syncQueryStateWithUrl: typeof syncGlobalQueryStateWithUrl;
