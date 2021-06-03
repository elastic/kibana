/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '../../../../common';
import {
  DocTableLegacy,
  DocTableLegacyProps,
} from '../../angular/doc_table/create_doc_table_react';
import { IndexPattern, IndexPatternField } from '../../../../../data/common/index_patterns';
import { LoadingState, LoadingStatus } from '../../angular/context_query_state';
import { ActionBar, ActionBarProps } from '../../angular/context/components/action_bar/action_bar';
import { DiscoverGrid, DiscoverGridProps } from '../discover_grid/discover_grid';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';
import { AppState } from '../../angular/context_state';
import { EsHitRecord, EsHitRecordList } from '../../angular/context/api/context';
import { DiscoverServices } from '../../../build_services';
import { SortPairArr } from '../../angular/doc_table/lib/get_sort';

export interface ContextAppContentProps {
  columns: string[];
  onAddColumn: (columnsName: string) => void;
  onRemoveColumn: (columnsName: string) => void;
  onSetColumns: (columnsNames: string[]) => void;
  services: DiscoverServices;
  indexPattern: IndexPattern;
  predecessorCount: number;
  successorCount: number;
  rows: EsHitRecordList;
  sort: SortPairArr[];
  predecessors: EsHitRecordList;
  successors: EsHitRecordList;
  anchorStatus: LoadingState;
  predecessorsStatus: LoadingState;
  successorsStatus: LoadingState;
  useNewFieldsApi: boolean;
  defaultStepSize: number;
  isLegacy: boolean;
  setAppState: (newState: Partial<AppState>) => void;
  addFilter: (
    field: IndexPatternField | string,
    values: unknown,
    operation: string
  ) => Promise<void>;
}

const DataGridMemoized = React.memo(DiscoverGrid);
const PREDECESSOR_TYPE = 'predecessors';
const SUCCESSOR_TYPE = 'successors';

function isLoading(status: LoadingState) {
  return status !== LoadingStatus.LOADED && status !== LoadingStatus.FAILED;
}

export function ContextAppContent({
  columns,
  onAddColumn,
  onRemoveColumn,
  onSetColumns,
  services,
  indexPattern,
  predecessorCount,
  successorCount,
  rows,
  sort,
  predecessors,
  successors,
  anchorStatus,
  predecessorsStatus,
  successorsStatus,
  defaultStepSize,
  useNewFieldsApi,
  isLegacy,
  setAppState,
  addFilter,
}: ContextAppContentProps) {
  const { uiSettings: config } = services;
  const [expandedDoc, setExpandedDoc] = useState<EsHitRecord | undefined>(undefined);
  const isAnchorLoaded = anchorStatus === LoadingStatus.LOADED;

  const actionBarProps = (type: string) => {
    const isPredecessorType = type === PREDECESSOR_TYPE;
    return {
      defaultStepSize,
      docCount: isPredecessorType ? predecessorCount : successorCount || defaultStepSize,
      docCountAvailable: isPredecessorType ? predecessors.length : successors.length,
      onChangeCount: (count) => {
        const countKey = type === PREDECESSOR_TYPE ? 'predecessorCount' : 'successorCount';
        setAppState({ [countKey]: count });
      },
      isLoading: isPredecessorType
        ? isLoading(predecessorsStatus || LoadingStatus.UNINITIALIZED)
        : isLoading(successorsStatus || LoadingStatus.UNINITIALIZED),
      type,
      isDisabled: !isAnchorLoaded,
    } as ActionBarProps;
  };

  const docTableProps = () => {
    return {
      ariaLabelledBy: 'surDocumentsAriaLabel',
      columns,
      rows: rows as ElasticSearchHit[],
      indexPattern,
      expandedDoc,
      isLoading: isLoading(anchorStatus || LoadingStatus.UNINITIALIZED),
      sampleSize: 0,
      sort,
      isSortEnabled: false,
      showTimeCol: !config.get(DOC_HIDE_TIME_COLUMN_SETTING, false) && !!indexPattern.timeFieldName,
      services,
      useNewFieldsApi,
      isPaginationEnabled: false,
      setExpandedDoc,
      onFilter: addFilter,
      onAddColumn,
      onRemoveColumn,
      onSetColumns,
    } as DiscoverGridProps;
  };

  const legacyDocTableProps = () => {
    // @ts-expect-error doesn't implement full DocTableLegacyProps interface
    return {
      columns,
      indexPattern,
      minimumVisibleRows: rows.length,
      rows,
      onFilter: addFilter,
      onAddColumn,
      onRemoveColumn,
      sort: sort.map((el) => [el]),
      useNewFieldsApi,
    } as DocTableLegacyProps;
  };

  const loadingFeedback = () => {
    if (anchorStatus === LoadingStatus.UNINITIALIZED || anchorStatus === LoadingStatus.LOADING) {
      return (
        <EuiText textAlign="center" data-test-subj="contextApp_loadingIndicator">
          <FormattedMessage id="discover.context.loadingDescription" defaultMessage="Loading..." />
        </EuiText>
      );
    }
    return null;
  };

  return (
    <Fragment>
      <ActionBar {...actionBarProps(PREDECESSOR_TYPE)} />
      {isLegacy && loadingFeedback()}
      <EuiHorizontalRule margin="xs" />
      {isLegacy ? (
        isAnchorLoaded && (
          <div className="discover-table">
            <DocTableLegacy {...legacyDocTableProps()} />
          </div>
        )
      ) : (
        <div className="dscDocsGrid">
          <DataGridMemoized {...docTableProps()} />
        </div>
      )}
      <EuiHorizontalRule margin="xs" />
      <ActionBar {...actionBarProps(SUCCESSOR_TYPE)} />
    </Fragment>
  );
}
