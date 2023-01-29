/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef } from 'react';
import { css } from '@emotion/react';
import { EuiFlexItem } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import { METRIC_TYPE } from '@kbn/analytics';
import { DataView } from '@kbn/data-views-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FilterItem, FilterItemProps } from './filter_item';
import type { IUnifiedSearchPluginServices } from '../../types';

/**
 * Properties for the filter items component, which will render a single filter pill for every filter that is sent in
 * as part of the `Filter[]` property.
 */
export interface FilterItemsProps {
  /** Array of filters that will be rendered as filter pills */
  filters: Filter[];
  /** Optional property that controls whether or not clicking the filter pill opens a popover *and* whether
   * or not the `x` button to remove the filter is rendered.*/
  readOnly?: boolean;
  /** If not read only, this is called whenever a filter is removed and/or updated */
  onFiltersUpdated?: (filters: Filter[]) => void;
  /** A list of all dataviews that are used for the filters */
  indexPatterns: DataView[];
  /** This is injected by the lazer loader */
  intl: InjectedIntl;
  /** Controls whether or not filter suggestions are influenced by the global time */
  timeRangeForSuggestionsOverride?: boolean;
  /** Array of panel options that controls the styling of each filter pill */
  hiddenPanelOptions?: FilterItemProps['hiddenPanelOptions'];
}

const FilterItemsUI = React.memo(function FilterItemsUI(props: FilterItemsProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const kibana = useKibana<IUnifiedSearchPluginServices>();
  const { appName, usageCollection, uiSettings } = kibana.services;
  const { readOnly = false } = props;

  if (!uiSettings) return null;

  const reportUiCounter = usageCollection?.reportUiCounter.bind(usageCollection, appName);

  function onFiltersUpdated(filters: Filter[]) {
    if (props.onFiltersUpdated) {
      props.onFiltersUpdated(filters);
    }
  }

  function renderItems() {
    return props.filters.map((filter, i) => (
      <EuiFlexItem
        key={i}
        grow={false}
        css={css`
          max-width: 100%;
        `}
      >
        <FilterItem
          id={`${i}`}
          intl={props.intl}
          filter={filter}
          onUpdate={(newFilter) => onUpdate(i, newFilter)}
          onRemove={() => onRemove(i)}
          indexPatterns={props.indexPatterns}
          uiSettings={uiSettings!}
          hiddenPanelOptions={props.hiddenPanelOptions}
          timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
          readOnly={readOnly}
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

  return <div data-test-subj="unifiedFilterItems">{renderItems()}</div>;
});

const FilterItems = injectI18n(FilterItemsUI);
// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default FilterItems;
