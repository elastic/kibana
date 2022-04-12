/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from 'src/plugins/data_views/common';
import { get } from 'lodash';
import { from } from 'rxjs';
import { ControlsDataService } from '../data';
import { ControlsPluginStartDeps } from '../../types';
import { KibanaPluginServiceFactory } from '../../../../presentation_util/public';

export type DataServiceFactory = KibanaPluginServiceFactory<
  ControlsDataService,
  ControlsPluginStartDeps
>;

const minMaxAgg = (field?: DataViewField) => {
  const aggBody: Record<string, any> = {};
  if (field) {
    if (field.scripted) {
      aggBody.script = {
        source: field.script,
        lang: field.lang,
      };
    } else {
      aggBody.field = field.name;
    }
  }

  return {
    maxAgg: {
      max: aggBody,
    },
    minAgg: {
      min: aggBody,
    },
  };
};

export const dataServiceFactory: DataServiceFactory = ({ startPlugins }) => {
  const {
    data: { query: queryPlugin, search },
  } = startPlugins;
  const { data } = startPlugins;

  const fetchFieldRange: ControlsDataService['fetchFieldRange'] = async (
    dataView,
    fieldName,
    input
  ) => {
    const { ignoreParentSettings, query, timeRange } = input;
    let { filters = [] } = input;

    const field = dataView.getFieldByName(fieldName);

    if (!field) {
      throw new Error('Field Missing Error');
    }

    if (timeRange) {
      const timeFilter = data.query.timefilter.timefilter.createFilter(dataView, timeRange);
      if (timeFilter) {
        filters = filters.concat(timeFilter);
      }
    }

    const searchSource = await data.search.searchSource.create();
    searchSource.setField('size', 0);
    searchSource.setField('index', dataView);

    const aggs = minMaxAgg(field);
    searchSource.setField('aggs', aggs);

    searchSource.setField('filter', ignoreParentSettings?.ignoreFilters ? [] : filters);
    searchSource.setField('query', ignoreParentSettings?.ignoreQuery ? undefined : query);

    const resp = await searchSource.fetch$().toPromise();

    const min = get(resp, 'rawResponse.aggregations.minAgg.value', undefined);
    const max = get(resp, 'rawResponse.aggregations.maxAgg.value', undefined);

    return {
      min: min === null ? undefined : min,
      max: max === null ? undefined : max,
    };
  };

  return {
    fetchFieldRange,
    fetchFieldRange$: (dataView, fieldName, input) =>
      from(fetchFieldRange(dataView, fieldName, input)),
    getDataView: data.dataViews.get,
    getDataView$: (id: string) => from(data.dataViews.get(id)),
    query: queryPlugin,
    searchSource: search.searchSource,
    timefilter: queryPlugin.timefilter.timefilter,
  };
};
