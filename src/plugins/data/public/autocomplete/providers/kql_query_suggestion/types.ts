/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KueryNode } from '@kbn/es-query';
import { CoreSetup } from '@kbn/core/public';
import { DataPublicPluginStart, QuerySuggestionBasic, QuerySuggestionGetFnArgs } from '../../..';

export type KqlQuerySuggestionProvider<T = QuerySuggestionBasic> = (
  core: CoreSetup<object, DataPublicPluginStart>
) => (querySuggestionsGetFnArgs: QuerySuggestionGetFnArgs, kueryNode: KueryNode) => Promise<T[]>;
