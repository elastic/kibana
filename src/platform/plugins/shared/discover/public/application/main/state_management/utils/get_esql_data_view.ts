/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import {
  getESQLAdHocDataview,
  getIndexPatternFromESQLQuery,
  getTimeFieldFromESQLQuery,
} from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiscoverServices } from '../../../../build_services';

export async function getEsqlDataView(
  query: AggregateQuery,
  currentDataView: DataView | undefined,
  services: DiscoverServices
) {
  const indexPatternFromQuery = getIndexPatternFromESQLQuery(query.esql);
  // Convert undefined time fields to a string since '' and undefined are equivalent here
  const currentTimeField = currentDataView?.timeFieldName ?? '';
  const newTimeField = getTimeFieldFromESQLQuery(query.esql) ?? '';
  const onlyTimeFieldChanged =
    indexPatternFromQuery === currentDataView?.getIndexPattern() &&
    newTimeField !== currentTimeField;

  if (
    currentDataView?.isPersisted() ||
    indexPatternFromQuery !== currentDataView?.getIndexPattern() ||
    // here the pattern hasn't changed but the time field has
    onlyTimeFieldChanged
  ) {
    return await getESQLAdHocDataview({
      dataViewsService: services.dataViews,
      query: query.esql,
      options: {
        // make sure that data view service cache is not used when creating the ES|QL data view,
        // otherwise a single mutated data view instance would be used across tabs (inside currentDataView$) which would be incorrect
        // https://github.com/elastic/kibana/issues/234719
        createNewInstanceEvenIfCachedOneAvailable: !currentDataView || onlyTimeFieldChanged,
      },
      http: services.http,
    });
  }
  return currentDataView;
}
