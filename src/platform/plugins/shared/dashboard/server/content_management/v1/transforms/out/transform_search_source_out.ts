/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
import { Filter } from '@kbn/es-query';
import { has } from 'lodash';
import { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import { DashboardAttributes, DashboardFilter, DashboardQuery } from '../../types';

function cleanFiltersForSerialize(filters?: Filter[]): DashboardFilter {
  if (!filters) return [];
  return filters.map((filter) => {
    if (filter.meta?.value) delete filter.meta.value;
    return filter;
  });
}

function migrateLegacyQuery(
  query: DashboardQuery | { [key: string]: any } | string
): DashboardQuery {
  // Lucene was the only option before, so language-less queries are all lucene
  if (!has(query, 'language')) {
    return { query, language: 'lucene' };
  }

  return query as DashboardQuery;
}

export function transformSearchSourceOut(
  kibanaSavedObjectMeta: DashboardSavedObjectAttributes['kibanaSavedObjectMeta'],
  references: SavedObjectReference[] = []
): DashboardAttributes['kibanaSavedObjectMeta'] {
  const { searchSourceJSON } = kibanaSavedObjectMeta;
  if (!searchSourceJSON) {
    return {};
  }
  const parsedSearchSource = parseSearchSourceJSON(searchSourceJSON);
  const searchSource = injectReferences(parsedSearchSource, references);
  const filter = cleanFiltersForSerialize(searchSource.filter) || [];
  const query = searchSource.query ? migrateLegacyQuery(searchSource.query) : undefined;

  return {
    searchSource: { filter, query },
  };
}
