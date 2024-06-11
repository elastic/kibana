/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewLazy } from '@kbn/data-views-plugin/common';
import { fromKueryExpression, getKqlFieldNames } from '@kbn/es-query';
import type { SearchRequest } from './fetch';
import { EsQuerySortValue } from '../..';

export async function queryToFields({
  dataView,
  sort,
  request,
}: {
  dataView: DataViewLazy;
  sort?: EsQuerySortValue | EsQuerySortValue[];
  request: SearchRequest;
}) {
  let fields = dataView.timeFieldName ? [dataView.timeFieldName] : [];
  if (sort) {
    const sortArr = Array.isArray(sort) ? sort : [sort];
    fields.push(...sortArr.flatMap((s) => Object.keys(s)));
  }
  for (const query of request.query) {
    if (query.query) {
      const nodes = fromKueryExpression(query.query);
      const queryFields = getKqlFieldNames(nodes);
      fields = fields.concat(queryFields);
    }
  }
  const filters = request.filters;
  if (filters) {
    const filtersArr = Array.isArray(filters) ? filters : [filters];
    for (const f of filtersArr) {
      // unified search bar filters have meta object and key (regular filters)
      // unified search bar "custom" filters ("Edit as query DSL", where meta.key is not present but meta is)
      // Any other Elasticsearch query DSL filter that gets passed in by consumers (not coming from unified search, and these probably won't have a meta key at all)
      if (f?.meta?.key && f.meta.disabled !== true) {
        fields.push(f.meta.key);
      }
    }
  }

  // if source filtering is enabled, we need to fetch all the fields
  const fieldName =
    dataView.getSourceFiltering() && dataView.getSourceFiltering().excludes.length ? ['*'] : fields;

  if (fieldName.length) {
    return (await dataView.getFields({ fieldName })).getFieldMapSorted();
  }

  // no fields needed to be loaded for query
  return {};
}
