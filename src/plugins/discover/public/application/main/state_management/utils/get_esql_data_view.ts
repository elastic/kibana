/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AggregateQuery } from '@kbn/es-query';
import {
  getESQLAdHocDataview,
  getIndexPatternFromESQLQuery,
  getTimeFieldFromESQLQuery,
} from '@kbn/esql-utils';
import { DataView } from '@kbn/data-views-plugin/common';
import { DiscoverServices } from '../../../../build_services';

export async function getEsqlDataView(
  query: AggregateQuery,
  currentDataView: DataView | undefined,
  services: DiscoverServices
) {
  const indexPatternFromQuery = getIndexPatternFromESQLQuery(query.esql);
  const newTimeField = getTimeFieldFromESQLQuery(query.esql);
  if (
    currentDataView?.isPersisted() ||
    indexPatternFromQuery !== currentDataView?.getIndexPattern() ||
    // here the pattern hasn't changed but the time field has
    (newTimeField !== currentDataView?.timeFieldName &&
      indexPatternFromQuery === currentDataView?.getIndexPattern())
  ) {
    return await getESQLAdHocDataview(query.esql, services.dataViews);
  }
  return currentDataView;
}
