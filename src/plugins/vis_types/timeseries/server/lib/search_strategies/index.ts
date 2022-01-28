/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DefaultSearchCapabilities } from './capabilities/default_search_capabilities';
import { AbstractSearchStrategy } from './strategies';

export { SearchStrategyRegistry } from './search_strategy_registry';
export { AbstractSearchStrategy, RollupSearchStrategy, DefaultSearchStrategy } from './strategies';
export type { EsSearchRequest } from './strategies/abstract_search_strategy';

export type SearchCapabilities = DefaultSearchCapabilities;
export type SearchStrategy = AbstractSearchStrategy;
