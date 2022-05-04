/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KueryNode } from '@kbn/es-query';
import type { CoreSetup } from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '../../../types';
import type { QuerySuggestionBasic, QuerySuggestionGetFnArgs } from '../query_suggestion_provider';

export type KqlQuerySuggestionProvider<T = QuerySuggestionBasic> = (
  core: CoreSetup<object, UnifiedSearchPublicPluginStart>
) => (querySuggestionsGetFnArgs: QuerySuggestionGetFnArgs, kueryNode: KueryNode) => Promise<T[]>;
