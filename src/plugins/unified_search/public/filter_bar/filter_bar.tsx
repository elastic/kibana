/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import {
  Filter,
  enableFilter,
  disableFilter,
  pinFilter,
  toggleFilterDisabled,
  toggleFilterNegated,
  unpinFilter,
} from '@kbn/es-query';
import classNames from 'classnames';
import React, { useRef } from 'react';

import { METRIC_TYPE } from '@kbn/analytics';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IDataPluginServices } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { FilterOptions } from './filter_options';
import { FilterItem } from './filter_item';
import { FilterAdd } from './filter_add';

export interface Props {
  filters: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  className: string;
  indexPatterns: DataView[];
  intl: InjectedIntl;
  appName: string;
  timeRangeForSuggestionsOverride?: boolean;
}

const FilterBarUI = React.memo(function FilterBarUI(props: Props) {
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

  function onAdd(filter: Filter) {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:added`);

    const filters = [...props.filters, filter];
    onFiltersUpdated(filters);
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

  function onEnableAll() {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:enable_all`);
    const filters = props.filters.map(enableFilter);
    onFiltersUpdated(filters);
  }

  function onDisableAll() {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:disable_all`);
    const filters = props.filters.map(disableFilter);
    onFiltersUpdated(filters);
  }

  function onPinAll() {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:pin_all`);
    const filters = props.filters.map(pinFilter);
    onFiltersUpdated(filters);
  }

  function onUnpinAll() {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:unpin_all`);
    const filters = props.filters.map(unpinFilter);
    onFiltersUpdated(filters);
  }

  function onToggleAllNegated() {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:invert_all`);
    const filters = props.filters.map(toggleFilterNegated);
    onFiltersUpdated(filters);
  }

  function onToggleAllDisabled() {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:toggle_all`);
    const filters = props.filters.map(toggleFilterDisabled);
    onFiltersUpdated(filters);
  }

  function onRemoveAll() {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:remove_all`);
    onFiltersUpdated([]);
  }

  const classes = classNames('globalFilterBar', props.className);

  const renderOpenPopoverButton = (onClick: () => void) => (
    <EuiButtonEmpty
      size="s"
      onClick={onClick}
      data-test-subj="addFilter"
      className="globalFilterBar__addButton"
    >
      +{' '}
      <FormattedMessage
        id="unifiedSearch.filter.filterBar.addFilterButtonLabel"
        defaultMessage="Add filter"
      />
    </EuiButtonEmpty>
  );

  return (
    <EuiFlexGroup
      className="globalFilterGroup"
      gutterSize="none"
      alignItems="flexStart"
      responsive={false}
    >
      <EuiFlexItem className="globalFilterGroup__branch" grow={false}>
        <FilterOptions
          onEnableAll={onEnableAll}
          onDisableAll={onDisableAll}
          onPinAll={onPinAll}
          onUnpinAll={onUnpinAll}
          onToggleAllNegated={onToggleAllNegated}
          onToggleAllDisabled={onToggleAllDisabled}
          onRemoveAll={onRemoveAll}
        />
      </EuiFlexItem>

      <EuiFlexItem className="globalFilterGroup__filterFlexItem">
        <EuiFlexGroup
          ref={groupRef}
          className={classes}
          wrap={true}
          responsive={false}
          gutterSize="xs"
          alignItems="center"
          tabIndex={-1}
        >
          {renderItems()}
          <FilterAdd
            renderButton={renderOpenPopoverButton}
            dataViews={props.indexPatterns}
            timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
            onAdd={onAdd}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

const FilterBar = injectI18n(FilterBarUI);
// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default FilterBar;
