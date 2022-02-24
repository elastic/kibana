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
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { METRIC_TYPE } from '@kbn/analytics';
import { FilterItem } from './filter_item';
import { useKibana } from '../../../../kibana_react/public';
import { IDataPluginServices, IIndexPattern, SavedQueryService } from '../..';
import type { SavedQuery } from '../../query';
import { SavedQueriesItem } from './saved_queries_item';
import { FilterExpressionItem } from './filter_expression_item';

import { EditFilterModal, FilterGroup } from '../query_string_input/edit_filter_modal';
import { mapAndFlattenFilters } from '../../query/filter_manager/lib/map_and_flatten_filters';
import { SavedQueryMeta } from '../saved_query_form';
import { QUERY_BUILDER } from '../query_string_input/add_filter_modal';

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
  const [groupIds, setGroupIds] = useState<number[]>([]);
  // we need this to disable quick_form tab for editing saved filters
  const [selectedSavedFiltersGroupIds, setSelectedSavedFiltersGroupIds] = useState<number[]>([]);

  const getInitForField = useCallback((multipleFilters: any[], field: string, minValue: number) => {
    return multipleFilters.length
      ? Math.max.apply(
          Math,
          multipleFilters.map((f) => f[field])
        ) + 1
      : minValue;
  }, []);

  const sortFiltersByGroupId = useCallback((multipleFilters: Filter[]) => {
    // when user adds new filters in edit modal they should appear near of editing filter
    let gId: number = 0;
    let reserveGroupId: number; // for cases where multiple filters have same groupId
    return multipleFilters.map((filter, idx) => {
      if (filter.groupId !== reserveGroupId) {
        reserveGroupId = filter.groupId;
        gId++;
      }
      return {
        ...filter,
        groupId: gId,
        id: idx,
      };
    });
  }, []);

  useEffect(() => {
    const savedFiltersGroupIds: number[] = [];
    let groupId = getInitForField(props.multipleFilters, 'groupId', 1);
    let id = getInitForField(props.multipleFilters, 'id', 0);

    const groupsFromSavedFilters: Filter[] = [];
    props.selectedSavedQueries?.map((savedQuery) => {
      savedQuery.attributes.filters?.map((f) => {
        savedFiltersGroupIds.push(groupId);
        groupsFromSavedFilters.push({
          ...f,
          groupId,
          id,
          subgroupId: 1,
          relationship: undefined,
        });
        groupId++;
        id++;
      });
    });
    setSelectedSavedFiltersGroupIds(savedFiltersGroupIds);
    props?.onMultipleFiltersUpdated?.([...props.multipleFilters, ...groupsFromSavedFilters]);
  }, [props.selectedSavedQueries]);

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

  function onEditMultipleFilters(selectedFilters: Filter[]) {
    const editedFilters = props.multipleFilters.filter((f) => groupIds.includes(f.groupId));
    const oldFilters = props.filters.filter(
      (filter) => !editedFilters.find((editedFilter) => isEqual(filter.query, editedFilter.query))
    );
    const updatedFilters = [...oldFilters, ...selectedFilters];
    props?.onFiltersUpdated?.(updatedFilters);

    const editedFilterGroupId = groupIds[0];
    const multipleFilters = [...props.multipleFilters];
    const idxEditedFilterInMultiple = props.multipleFilters.findIndex(
      (f) => Number(f.groupId) === Number(editedFilterGroupId)
    );
    const initGroupId = getInitForField(props.multipleFilters, 'groupId', 1);
    const initId = getInitForField(props.multipleFilters, 'id', 0);
    const newMultipleFilters = selectedFilters.map((filter, idx) => {
      return {
        ...filter,
        groupId: initGroupId + idx,
        id: initId + idx,
        relationship: 'AND',
        subGroupId: 1,
      };
    });

    multipleFilters.splice(idxEditedFilterInMultiple, groupIds.length, ...newMultipleFilters);
    const updatedMultipleFilters = sortFiltersByGroupId(multipleFilters);

    props?.onMultipleFiltersUpdated?.(updatedMultipleFilters);
    props.toggleEditFilterModal?.(false);
  }

  function onEditMultipleFiltersANDOR(
    selectedFilters: FilterGroup[],
    buildFilters: Filter[],
    groupCount: number = 0
  ) {
    const editedFilters = props.multipleFilters.filter((f) => groupIds.includes(f.groupId));
    const oldFilters = props.filters.filter(
      (filter) => !editedFilters.find((editedFilter) => isEqual(filter.query, editedFilter.query))
    );
    const updatedFilters = [...oldFilters, ...buildFilters];
    props?.onFiltersUpdated?.(updatedFilters);

    const mappedFilters = mapAndFlattenFilters(buildFilters);
    const mergedFilters = mappedFilters.map((filter, idx) => {
      return {
        ...filter,
        groupId: selectedFilters[idx].groupId,
        id: selectedFilters[idx].id,
        relationship: selectedFilters[idx].relationship,
        subGroupId: selectedFilters[idx].subGroupId,
        groupCount,
      };
    });

    const multipleFilters = [...props.multipleFilters];

    const indexOfCurFilter = multipleFilters.findIndex(
      (f) => Number(f.groupId) === Number(groupIds[0])
    );
    multipleFilters.splice(indexOfCurFilter, groupIds.length, ...mergedFilters);
    const updatedMultipleFilters = sortFiltersByGroupId(multipleFilters);

    props?.onMultipleFiltersUpdated?.(updatedMultipleFilters);
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
    for (const [gId, groupedFilters] of Object.entries(firstDepthGroupedFilters)) {
      const badge = (
        <FilterExpressionItem
          groupId={gId}
          groupedFilters={groupedFilters}
          indexPatterns={props?.indexPatterns}
          onClick={() => {}}
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
          onClick={() => {}}
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
    const currentEditFilters: Filter[] = [];
    groupIds?.forEach((groupId) => {
      const filteredFilters = props.multipleFilters.filter((filter) => filter.groupId === groupId);
      currentEditFilters.push(...filteredFilters);
    });

    const saerchedFilters: Filter[] = [];

    currentEditFilters.forEach((filter) => {
      props.filters.forEach((f) => {
        if (isEqual(f.query, filter.query)) {
          saerchedFilters.push(f);
        }
      });
    });

    const queryBuilderTab = QUERY_BUILDER;
    const tabs = selectedSavedFiltersGroupIds.some((g) => groupIds.includes(g))
      ? [queryBuilderTab]
      : undefined;

    return (
      <EuiFlexItem grow={false}>
        {props.isEditFilterModalOpen && (
          <EditFilterModal
            onSubmit={onEditMultipleFilters}
            onMultipleFiltersSubmit={onEditMultipleFiltersANDOR}
            onCancel={() => props.toggleEditFilterModal?.(false)}
            filter={saerchedFilters[0]}
            currentEditFilters={currentEditFilters}
            filters={saerchedFilters}
            multipleFilters={props.multipleFilters}
            indexPatterns={props.indexPatterns!}
            onRemoveFilterGroup={onDeleteFilterGroup}
            timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
            initialAddFilterMode={undefined}
            saveFilters={props.onFilterSave}
            savedQueryService={props.savedQueryService}
            tabs={tabs}
            initialLabel={saerchedFilters[0].meta.alias!}
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
      className={classNames('globalFilterGroup', {
        'globalFilterGroup--hasFilters':
          props.filters.length > 0 || props.multipleFilters.length > 0,
      })}
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
          {/*{renderSelectedSavedQueries()}*/}
          {props.multipleFilters.length === 0 && renderItems()}
          {renderEditFilter()}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

export const FilterBar = injectI18n(FilterBarUI);
