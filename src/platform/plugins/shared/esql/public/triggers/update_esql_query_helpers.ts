/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';

interface Context {
  data: DataPublicPluginStart;
  queryString: string;
}

export async function isActionCompatible(data: DataPublicPluginStart) {
  const { query } = data;
  const currentQueryString = query.queryString.getQuery();
  // we want to make sure that the current query is an ES|QL query
  return currentQueryString && isOfAggregateQueryType(currentQueryString);
}

export async function executeAction({ queryString, data }: Context) {
  const isCompatibleAction = await isActionCompatible(data);
  if (!isCompatibleAction) {
    throw new IncompatibleActionError();
  }

  const { query } = data;
  query.queryString.setQuery({
    esql: queryString,
  });
}
