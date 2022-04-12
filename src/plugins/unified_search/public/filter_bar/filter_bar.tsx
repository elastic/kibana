/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import {
  buildEmptyFilter,
  Filter,
  enableFilter,
  disableFilter,
  pinFilter,
  toggleFilterDisabled,
  toggleFilterNegated,
  unpinFilter,
} from '@kbn/es-query';
import classNames from 'classnames';
import React, { useState, useRef } from 'react';

import { METRIC_TYPE } from '@kbn/analytics';
import { FilterEditor } from './filter_editor';
import { FILTER_EDITOR_WIDTH, FilterItem } from './filter_item';
import { FilterOptions } from './filter_options';
import { useKibana } from '../../../kibana_react/public';
import { UI_SETTINGS } from '../../../data/common';
import { IDataPluginServices } from '../../../data/public';
import { DataView } from '../../../data_views/public';

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
  const [isAddFilterPopoverOpen, setIsAddFilterPopoverOpen] = useState(false);
  const kibana = useKibana<IDataPluginServices>();
  const { appName, usageCollection, uiSettings } = kibana.services;
  if (!uiSettings) return null;

  const reportUiCounter = usageCollection?.reportUiCounter.bind(usageCollection, appName);

  function onFiltersUpdated(filters: Filter[]) {
    if (props.onFiltersUpdated) {
      props.onFiltersUpdated(filters);
    }
  }

  const onAddFilterClick = () => setIsAddFilterPopoverOpen(!isAddFilterPopoverOpen);

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

  function renderAddFilter() {
    const isPinned = uiSettings!.get(UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT);
    const [indexPattern] = props.indexPatterns;
    const index = indexPattern && indexPattern.id;
    const newFilter = buildEmptyFilter(isPinned, index);

    const button = (
      <EuiButtonEmpty
        size="s"
        onClick={onAddFilterClick}
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
      <EuiFlexItem grow={false}>
        <EuiPopover
          id="addFilterPopover"
          button={button}
          isOpen={isAddFilterPopoverOpen}
          closePopover={() => setIsAddFilterPopoverOpen(false)}
          anchorPosition="downLeft"
          panelPaddingSize="none"
          initialFocus=".filterEditor__hiddenItem"
          ownFocus
          repositionOnScroll
        >
          <EuiFlexItem grow={false}>
            <div style={{ width: FILTER_EDITOR_WIDTH, maxWidth: '100%' }}>
              <FilterEditor
                filter={newFilter}
                indexPatterns={props.indexPatterns}
                onSubmit={onAdd}
                onCancel={() => setIsAddFilterPopoverOpen(false)}
                key={JSON.stringify(newFilter)}
                timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
              />
            </div>
          </EuiFlexItem>
        </EuiPopover>
      </EuiFlexItem>
    );
  }

  function onAdd(filter: Filter) {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:added`);
    setIsAddFilterPopoverOpen(false);

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
          {renderAddFilter()}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

const FilterBar = injectI18n(FilterBarUI);
// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default FilterBar;
