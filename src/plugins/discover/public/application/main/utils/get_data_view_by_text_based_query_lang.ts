/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AggregateQuery } from '@kbn/es-query';
import {
  getESQLAdHocDataviewLazy,
  getIndexPatternFromSQLQuery,
  getIndexPatternFromESQLQuery,
} from '@kbn/esql-utils';
import { DataViewLazy } from '@kbn/data-views-plugin/common';
import { DiscoverServices } from '../../../build_services';

export async function getDataViewByTextBasedQueryLang(
  query: AggregateQuery,
  currentDataView: DataViewLazy | undefined,
  services: DiscoverServices
) {
  let indexPatternFromQuery = '';
  if ('sql' in query) {
    indexPatternFromQuery = getIndexPatternFromSQLQuery(query.sql);
  }
  if ('esql' in query) {
    indexPatternFromQuery = getIndexPatternFromESQLQuery(query.esql);
  }
  // we should find a better way to work with ESQL queries which dont need a dataview
  if (!indexPatternFromQuery && currentDataView) return currentDataView;

  if (
    currentDataView?.isPersisted() ||
    indexPatternFromQuery !== currentDataView?.getIndexPattern()
  ) {
    return await getESQLAdHocDataviewLazy(indexPatternFromQuery, services.dataViews);
  }
  return currentDataView;
}
