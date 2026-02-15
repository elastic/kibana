/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { AggregateQuery } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  appendFilteringWhereClauseForCascadeLayout,
  appendWhereClauseToESQLQuery,
} from '@kbn/esql-utils';
import { METRIC_TYPE } from '@kbn/analytics';
import { generateFilters } from '@kbn/data-plugin/public';
import { popularizeField } from '@kbn/unified-data-table';
import type { TabState } from '../types';
import type { DiscoverServices } from '../../../../../build_services';
import { selectTabRuntimeState } from '../runtime_state';
import { isCascadedDocumentsVisible } from '../../../components/layout/cascaded_documents';
import type { InternalStateThunkActionCreator, TabActionPayload } from '../internal_state';
import { selectTab } from '../selectors';

const getEsqlFilterOperator = (fieldName: string, values: unknown, operation: '+' | '-') => {
  if (fieldName === '_exists_') {
    return 'is_not_null';
  }

  if (values == null && operation === '-') {
    return 'is_not_null';
  }

  if (values == null && operation === '+') {
    return 'is_null';
  }

  return operation;
};

type DocViewFieldParam = NonNullable<Parameters<DocViewFilterFn>[0]>;

const addEsqlFilter = ({
  services,
  tabRuntimeState,
  tabState,
  dataView,
  query,
  field,
  fieldName,
  value,
  mode,
}: {
  services: DiscoverServices;
  tabRuntimeState: ReturnType<typeof selectTabRuntimeState>;
  tabState: TabState;
  dataView: DataView;
  query: AggregateQuery;
  field: DocViewFieldParam;
  fieldName: string;
  value: Parameters<DocViewFilterFn>[1];
  mode: Parameters<DocViewFilterFn>[2];
}) => {
  const fieldType = typeof field !== 'string' ? field.type : undefined;
  const isCascadeLayoutSelected = isCascadedDocumentsVisible(
    tabState.cascadedDocumentsState.availableCascadeGroups,
    query
  );

  const updatedQuery = isCascadeLayoutSelected
    ? appendFilteringWhereClauseForCascadeLayout(
        query.esql,
        tabState.esqlVariables,
        dataView,
        fieldName === '_exists_' ? String(value) : fieldName,
        fieldName === '_exists_' || value == null ? undefined : value,
        getEsqlFilterOperator(fieldName, value, mode),
        fieldType
      )
    : appendWhereClauseToESQLQuery(
        query.esql,
        fieldName === '_exists_' ? String(value) : fieldName,
        fieldName === '_exists_' || value == null ? undefined : value,
        getEsqlFilterOperator(fieldName, value, mode),
        fieldType
      );

  if (!updatedQuery) {
    return;
  }

  services.data.query.queryString.setQuery({
    esql: updatedQuery,
  });

  if (services.trackUiMetric) {
    services.trackUiMetric(METRIC_TYPE.CLICK, 'esql_filter_added');
  }

  void tabRuntimeState.scopedEbtManager$.getValue().trackFilterAddition({
    fieldName: fieldName === '_exists_' ? String(value) : fieldName,
    filterOperation: fieldName === '_exists_' ? '_exists_' : mode,
    fieldsMetadata: services.fieldsMetadata,
  });
};

const addClassicFilter = ({
  services,
  tabRuntimeState,
  dataView,
  field,
  fieldName,
  value,
  mode,
}: {
  services: DiscoverServices;
  tabRuntimeState: ReturnType<typeof selectTabRuntimeState>;
  dataView: DataView;
  field: DocViewFieldParam;
  fieldName: string;
  value: Parameters<DocViewFilterFn>[1];
  mode: Parameters<DocViewFilterFn>[2];
}) => {
  const newFilters = generateFilters(services.filterManager, field, value, mode, dataView);

  void popularizeField(dataView, fieldName, services.dataViews, services.capabilities);
  services.filterManager.addFilters(newFilters);

  if (services.trackUiMetric) {
    services.trackUiMetric(METRIC_TYPE.CLICK, 'filter_added');
  }

  void tabRuntimeState.scopedEbtManager$.getValue().trackFilterAddition({
    fieldName: fieldName === '_exists_' ? String(value) : fieldName,
    filterOperation: fieldName === '_exists_' ? '_exists_' : mode,
    fieldsMetadata: services.fieldsMetadata,
  });
};

export const addFilter: InternalStateThunkActionCreator<
  [
    TabActionPayload<{
      field: Parameters<DocViewFilterFn>[0];
      value: Parameters<DocViewFilterFn>[1];
      mode: Parameters<DocViewFilterFn>[2];
    }>
  ]
> = ({ tabId, field, value, mode }) =>
  function addFilterThunkFn(_, getState, { runtimeStateManager, services }) {
    if (field == null) {
      return;
    }

    const tabState = selectTab(getState(), tabId);
    const { query } = tabState.appState;

    const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
    const dataView = tabRuntimeState.currentDataView$.getValue();
    if (!dataView) {
      return;
    }

    const fieldName = typeof field === 'string' ? field : field.name;

    if (isOfAggregateQueryType(query)) {
      addEsqlFilter({
        services,
        tabRuntimeState,
        tabState,
        dataView,
        query,
        field,
        fieldName,
        value,
        mode,
      });
    } else {
      addClassicFilter({
        services,
        tabRuntimeState,
        dataView,
        field,
        fieldName,
        value,
        mode,
      });
    }
  };
