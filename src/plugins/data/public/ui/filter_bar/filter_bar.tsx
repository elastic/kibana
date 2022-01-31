/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPopover, EuiButtonIcon } from '@elastic/eui';
import { groupBy, isEqual } from 'lodash';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import {
  buildEmptyFilter,
  Filter,
  // enableFilter,
  // disableFilter,
  // pinFilter,
  // toggleFilterDisabled,
  toggleFilterNegated,
  // unpinFilter,
} from '@kbn/es-query';
import classNames from 'classnames';
import React, { useState, useRef } from 'react';

import { METRIC_TYPE } from '@kbn/analytics';
import { FilterEditor } from './filter_editor';
import { FILTER_EDITOR_WIDTH, FilterItem } from './filter_item';
// import { FilterOptions } from './filter_options';
import { useKibana } from '../../../../kibana_react/public';
import { IDataPluginServices, IIndexPattern } from '../..';
import type { SavedQuery } from '../../query';
import { SavedQueriesItem } from './saved_queries_item';
import { FilterExpressionItem } from './filter_expression_item';

import { UI_SETTINGS } from '../../../common';
import { EditFilterModal } from '../query_string_input/edit_filter_modal';

interface Props {
  filters: Filter[];
  multipleFilters: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  className: string;
  indexPatterns: IIndexPattern[];
  intl: InjectedIntl;
  appName: string;
  timeRangeForSuggestionsOverride?: boolean;
  selectedSavedQueries?: SavedQuery[];
  removeSelectedSavedQuery: (savedQuery: SavedQuery) => void;
  onMultipleFiltersUpdated?: (filters: Filter[]) => void;
  toggleEditFilterModal: (value: boolean) => void;
  isEditFilterModalOpen?: boolean;
  editFilterMode?: string;
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

  const onEditFilterClick = () => {
    props.toggleEditFilterModal?.(true);
  };

  const onDeleteFilterGroup = (groupId: string) => {
    const multipleFilters = [...props.multipleFilters];
    const updatedMultipleFilters = multipleFilters.filter(
      (filter) => filter.groupId !== Number(groupId)
    );
    const filters = [...props.filters];
    const updatedFilters: Filter[] = [];

    updatedMultipleFilters.forEach((filter) => {
      filters.forEach((f) => {
        if (isEqual(f.query, filter.query)) {
          updatedFilters.push(f);
        }
      });
    });
    onFiltersUpdated(updatedFilters);
    props?.onMultipleFiltersUpdated?.(updatedMultipleFilters);

    props.toggleEditFilterModal?.(false);
  };

  function renderItems() {
    return props.multipleFilters.map((filter, i) => {
      // Do not display filters from saved queries
      if (filter.meta.isFromSavedQuery) return null;
      return (
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
      );
    });
  }

  function renderSelectedSavedQueries() {
    return props?.selectedSavedQueries?.map((savedQuery, i) => (
      <EuiFlexItem key={i} grow={false} className="globalFilterBar__flexItem">
        <SavedQueriesItem
          savedQuery={savedQuery}
          onClick={() => props.removeSelectedSavedQuery(savedQuery)}
        />
      </EuiFlexItem>
    ));
  }

  function renderMultipleFilters() {
    const firstDepthGroupedFilters = groupBy(props.multipleFilters, 'groupId');
    const GroupBadge: JSX.Element[] = [];
    for (const [groupId, groupedFilters] of Object.entries(firstDepthGroupedFilters)) {
      const badge = (
        <FilterExpressionItem
          groupId={groupId}
          groupedFilters={groupedFilters}
          indexPatterns={props?.indexPatterns}
          onClick={() => { }}
          onRemove={onRemoveFilterGroup}
          onUpdate={onUpdateFilterGroup}
          filtersGroupsCount={Object.entries(firstDepthGroupedFilters).length}
          onEditFilterClick={onEditFilterClick}
        />
      );
      GroupBadge.push(badge);
    }
    return GroupBadge;
  }

  function renderEditFilter() {
    return (
      <EuiFlexItem grow={false}>
        {props.isEditFilterModalOpen && (
          <EditFilterModal
            applySavedQueries={() => props.toggleEditFilterModal?.(false)}
            onCancel={() => props.toggleEditFilterModal?.(false)}
            filter={props.filters[0]}
            multipleFilters={props.multipleFilters}
            indexPatterns={props.indexPatterns!}
            onRemoveFilterGroup={onDeleteFilterGroup}
            timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
            savedQueryManagement={undefined}
            initialAddFilterMode={undefined}
          />
        )}
      </EuiFlexItem>
    );
  }

  function onRemove(i: number) {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:removed`);
    const filters = [...props.filters];
    filters.splice(i, 1);
    onFiltersUpdated(filters);
    groupRef.current?.focus();
  }

  function onRemoveFilterGroup(groupId: string) {
    const multipleFilters = [...props.multipleFilters];
    const updatedMultipleFilters = multipleFilters.filter(
      (filter) => filter.groupId !== Number(groupId)
    );
    const filters = [...props.filters];
    const updatedFilters: Filter[] = [];

    updatedMultipleFilters.forEach((filter) => {
      filters.forEach((f) => {
        if (isEqual(f.query, filter.query)) {
          updatedFilters.push(f);
        }
      });
    });
    onFiltersUpdated(updatedFilters);
    props?.onMultipleFiltersUpdated?.(updatedMultipleFilters);
    groupRef.current?.focus();
  }

  function onUpdateFilterGroup(
    updatedMultipleFilters: Filter[],
    groupId: string,
    toggleNegate = false
  ) {
    const multipleFilters = [...props.multipleFilters];
    const notAffectedFilters = multipleFilters.filter(
      (filter) => filter.groupId !== Number(groupId)
    );
    const finalMultipleFilters = [...notAffectedFilters, ...updatedMultipleFilters];
    props?.onMultipleFiltersUpdated?.(finalMultipleFilters);
    const filters = [...props.filters];
    const toggleNegatedFilters = toggleNegate ? filters?.map(toggleFilterNegated) : filters;
    const updatedFilters: Filter[] = [];

    finalMultipleFilters.forEach((filter) => {
      toggleNegatedFilters.forEach((f) => {
        if (isEqual(f.query, filter.query)) {
          updatedFilters.push(f);
        }
      });
    });
    onFiltersUpdated(updatedFilters);
    groupRef.current?.focus();
  }

  function onUpdate(i: number, filter: Filter) {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:edited`);
    const filters = [...props.filters];
    filters[i] = filter;
    onFiltersUpdated(filters);
  }

  const classes = classNames('globalFilterBar', props.className);

  return (
    <EuiFlexGroup
      className="globalFilterGroup"
      gutterSize="none"
      alignItems="flexStart"
      responsive={false}
    >
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
          {renderMultipleFilters()}
          {renderSelectedSavedQueries()}
          {props.multipleFilters.length === 0 && renderItems()}
          {renderEditFilter()}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

export const FilterBar = injectI18n(FilterBarUI);
