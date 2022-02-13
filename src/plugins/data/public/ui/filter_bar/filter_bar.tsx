/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { groupBy, isEqual } from 'lodash';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { Filter, toggleFilterNegated } from '@kbn/es-query';
import classNames from 'classnames';
import React, { useRef, useState } from 'react';

import { METRIC_TYPE } from '@kbn/analytics';
import { FilterItem } from './filter_item';
import { useKibana } from '../../../../kibana_react/public';
import { IDataPluginServices, IIndexPattern } from '../..';
import type { SavedQuery } from '../../query';
import { SavedQueriesItem } from './saved_queries_item';
import { FilterExpressionItem } from './filter_expression_item';

import { EditFilterModal } from '../query_string_input/edit_filter_modal';
import { mapAndFlattenFilters } from '../../query/filter_manager/lib/map_and_flatten_filters';
import { FilterGroup } from '../query_string_input/edit_filter_modal';
import { SavedQueryMeta } from '../saved_query_form';
import { SavedQueryService } from '../..';

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
  savedQueryService: SavedQueryService;
  onFilterSave: (savedQueryMeta: SavedQueryMeta, saveAsNew?: boolean) => Promise<void>;
  onFilterBadgeSave: (groupId: number, alias: string) => void;
}

const FilterBarUI = React.memo(function FilterBarUI(props: Props) {
  const groupRef = useRef<HTMLDivElement>(null);
  const kibana = useKibana<IDataPluginServices>();
  const { appName, usageCollection, uiSettings } = kibana.services;
  const [groupIds, setGroupIds] = useState<[] | undefined>(undefined);
  if (!uiSettings) return null;

  const reportUiCounter = usageCollection?.reportUiCounter.bind(usageCollection, appName);

  function onFiltersUpdated(filters: Filter[]) {
    if (props.onFiltersUpdated) {
      props.onFiltersUpdated(filters);
    }
  }

  const onEditFilterClick = (groupIds: []) => {
    setGroupIds(groupIds);
    props.toggleEditFilterModal?.(true);
  };

  const onDeleteFilterGroup = () => {
    const multipleFilters = [...props.multipleFilters];

    const updatedMultipleFilters = multipleFilters.filter(
      (filter) => !groupIds.includes(filter.groupId)
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

  function onAddMultipleFilters(selectedFilters: Filter[]) {
    props.toggleEditFilterModal?.(false);

    const filters = [...props.filters, ...selectedFilters];
    props?.onFiltersUpdated?.(filters);
  }

  function onEditMultipleFiltersANDOR(
    selectedFilters: FilterGroup[],
    buildFilters: Filter[],
    groupCount: number
  ) {
    const mappedFilters = mapAndFlattenFilters(buildFilters);
    const mergedFilters = mappedFilters.map((filter, idx) => {
      return {
        ...filter,
        groupId: selectedFilters[idx].groupId,
        id: selectedFilters[idx].id,
        relationship: selectedFilters[idx].relationship,
        subGroupId: selectedFilters[idx].subGroupId,
        groupCount
      };
    });

    const multipleFilters = [...props.multipleFilters];

    const newMultipleFilters = multipleFilters.filter(
      (filter) => !groupIds.includes(filter.groupId)
    );

    const filtersNew = newMultipleFilters.concat(mergedFilters);

    const filters = [...props.filters, ...buildFilters];
    props?.onFiltersUpdated?.(filters);

    props?.onMultipleFiltersUpdated?.(filtersNew);

    props.toggleEditFilterModal?.(false);
  }

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
    const groupedByAlias = groupBy(props.multipleFilters, 'meta.alias');
    const filtersWithoutLabel = groupedByAlias.null || groupedByAlias.undefined;
    const labels = Object.keys(groupedByAlias).filter(
      (key) => key !== 'null' && key !== 'undefined'
    );

    const firstDepthGroupedFilters = groupBy(filtersWithoutLabel, 'groupId');
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
          savedQueryService={props.savedQueryService}
          onFilterSave={props.onFilterSave}
          onFilterBadgeSave={props.onFilterBadgeSave}
        />
      );
      GroupBadge.push(badge);
    }

    let groupId: string;
    labels.map((label) => {
      // we should have same groupIds on our labeled filters group
      groupId = (groupedByAlias[label][0] as any).groupId;
      const labelBadge = (
        <FilterExpressionItem
          groupId={groupId}
          groupedFilters={groupedByAlias[label]}
          indexPatterns={props?.indexPatterns}
          onClick={() => { }}
          onRemove={onRemoveFilterGroup}
          onUpdate={onUpdateFilterGroup}
          onEditFilterClick={onEditFilterClick}
          filtersGroupsCount={Object.entries(firstDepthGroupedFilters).length}
          customLabel={label}
          savedQueryService={props.savedQueryService}
          onFilterSave={props.onFilterSave}
          onFilterBadgeSave={props.onFilterBadgeSave}
        />
      );
      GroupBadge.push(labelBadge);
    });

    return GroupBadge;
  }

  function renderEditFilter() {
    let currentEditFilters = [];
    groupIds?.forEach((groupId) => {
      const filteredFilters = props.multipleFilters.filter(filter => filter.groupId === groupId);
      currentEditFilters.push(...filteredFilters);
    });

    return (
      <EuiFlexItem grow={false}>
        {props.isEditFilterModalOpen && (
          <EditFilterModal
            onSubmit={onAddMultipleFilters}
            onMultipleFiltersSubmit={onEditMultipleFiltersANDOR}
            applySavedQueries={() => props.toggleEditFilterModal?.(false)}
            onCancel={() => props.toggleEditFilterModal?.(false)}
            filter={currentEditFilters[0]}
            currentEditFilters={currentEditFilters}
            multipleFilters={props.multipleFilters}
            indexPatterns={props.indexPatterns!}
            onRemoveFilterGroup={onDeleteFilterGroup}
            timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
            initialAddFilterMode={undefined}
            saveFilters={props.onFilterSave}
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

  function onRemoveFilterGroup(groupIds: []) {
    const multipleFilters = [...props.multipleFilters];

    const updatedMultipleFilters = multipleFilters.filter(
      (filter) => !groupIds.includes(filter.groupId)
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
    groupIds: [],
    toggleNegate = false
  ) {
    const multipleFilters = [...props.multipleFilters];

    const notAffectedFilters = multipleFilters.filter(
      (filter) => !groupIds.includes(filter.groupId)
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
