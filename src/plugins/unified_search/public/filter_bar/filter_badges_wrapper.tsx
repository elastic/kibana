/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexItem } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import React, { useRef } from 'react';
import { IDataPluginServices } from '@kbn/data-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { DataView } from '@kbn/data-views-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FilterItem } from './filter_item';

export interface Props {
  filters: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  indexPatterns: DataView[];
  intl: InjectedIntl;
  timeRangeForSuggestionsOverride?: boolean;
}

const FilterBadgesWrapperUI = React.memo(function FilterBadgesWrapperUI(props: Props) {
  const groupRef = useRef<HTMLDivElement>(null);
  const kibana = useKibana<IDataPluginServices>();
  const { appName, usageCollection, uiSettings } = kibana.services;
  if (!uiSettings) return null;

  const reportUiCounter = usageCollection?.reportUiCounter.bind(usageCollection, appName);

  function onFiltersUpdated(filters: Filter[]) {
    if (props.onFiltersUpdated) {
      props.onFiltersUpdated(filters);
    }
  }

  function renderItems() {
    return props.filters.map((filter, i) => (
      <EuiFlexItem key={i} grow={false} className="globalFilterBar__flexItem">
        <FilterItem
          id={`${i}`}
          intl={props.intl}
          filter={filter}
          onUpdate={(newFilter) => onUpdate(i, newFilter)}
          onRemove={() => onRemove(i)}
          indexPatterns={props.indexPatterns}
          uiSettings={uiSettings!}
          timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
        />
      </EuiFlexItem>
    ));
  }

  function onRemove(i: number) {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:removed`);
    const filters = [...props.filters];
    filters.splice(i, 1);
    onFiltersUpdated(filters);
    groupRef.current?.focus();
  }

  function onUpdate(i: number, filter: Filter) {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:edited`);
    const filters = [...props.filters];
    filters[i] = filter;
    onFiltersUpdated(filters);
  }

  return <>{renderItems()}</>;
});

const FilterBadgesWrapper = injectI18n(FilterBadgesWrapperUI);
// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default FilterBadgesWrapper;
