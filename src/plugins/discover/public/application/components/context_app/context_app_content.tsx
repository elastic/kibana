/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, Fragment, useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import { CONTEXT_STEP_SETTING, DOC_HIDE_TIME_COLUMN_SETTING } from '../../../../common';
import { IndexPattern, IndexPatternField } from '../../../../../data/common/index_patterns';
import { SortDirection } from '../../../../../data/public';
import {
  DocTableLegacy,
  DocTableLegacyProps,
} from '../../angular/doc_table/create_doc_table_react';
import { LoadingStatus } from '../../angular/context_query_state';
import { ActionBar } from '../../angular/context/components/action_bar/action_bar';
import { DiscoverGrid, DiscoverGridProps } from '../discover_grid/discover_grid';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';
import { AppState } from '../../angular/context_state';
import { EsHitRecord, EsHitRecordList } from '../../angular/context/api/context';
import { DiscoverServices } from '../../../build_services';
import { clamp } from './utils/clamp';

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
  sort: [[string, SortDirection]];
  predecessors: EsHitRecordList;
  successors: EsHitRecordList;
  anchorStatus: LoadingStatus;
  predecessorsStatus: LoadingStatus;
  successorsStatus: LoadingStatus;
  useNewFieldsApi: boolean;
  isLegacy: boolean;
  setAppState: (newState: Partial<AppState>) => void;
  addFilter: (
    field: IndexPatternField | string,
    values: unknown,
    operation: string
  ) => Promise<void>;
}

const controlColumnIds = ['openDetails'];

const DataGridMemoized = React.memo(DiscoverGrid);
const DocTableLegacyMemoized = React.memo(DocTableLegacy);
const ActionBarMemoized = React.memo(ActionBar);

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
  useNewFieldsApi,
  isLegacy,
  setAppState,
  addFilter,
}: ContextAppContentProps) {
  const { uiSettings: config } = services;

  const [expandedDoc, setExpandedDoc] = useState<EsHitRecord | undefined>(undefined);
  const isAnchorLoaded = anchorStatus === LoadingStatus.LOADED;
  const isAnchorLoading =
    anchorStatus === LoadingStatus.LOADING || anchorStatus === LoadingStatus.UNINITIALIZED;
  const arePredecessorsLoading =
    predecessorsStatus === LoadingStatus.LOADING ||
    predecessorsStatus === LoadingStatus.UNINITIALIZED;
  const areSuccessorsLoading =
    successorsStatus === LoadingStatus.LOADING || successorsStatus === LoadingStatus.UNINITIALIZED;

  const showTimeCol = useMemo(
    () => !config.get(DOC_HIDE_TIME_COLUMN_SETTING, false) && !!indexPattern.timeFieldName,
    [config, indexPattern]
  );
  const defaultStepSize = useMemo(() => parseInt(config.get(CONTEXT_STEP_SETTING), 10), [config]);

  const docTableProps = () => {
    return {
      ariaLabelledBy: 'surDocumentsAriaLabel',
      columns,
      rows: rows as ElasticSearchHit[],
      indexPattern,
      expandedDoc,
      isLoading: isAnchorLoading,
      sampleSize: 0,
      sort: sort as [[string, SortDirection]],
      isSortEnabled: false,
      showTimeCol,
      services,
      useNewFieldsApi,
      isPaginationEnabled: false,
      controlColumnIds,
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
      sort,
      useNewFieldsApi,
    } as DocTableLegacyProps;
  };

  const loadingFeedback = () => {
    if (
      isLegacy &&
      (anchorStatus === LoadingStatus.UNINITIALIZED || anchorStatus === LoadingStatus.LOADING)
    ) {
      return (
        <EuiText textAlign="center" data-test-subj="contextApp_loadingIndicator">
          <FormattedMessage id="discover.context.loadingDescription" defaultMessage="Loading..." />
        </EuiText>
      );
    }
    return null;
  };

  const onChangeCount = useCallback(
    (type, count) => {
      const countKey = type === 'successors' ? 'successorCount' : 'predecessorCount';
      setAppState({ [countKey]: clamp(count) });
    },
    [setAppState]
  );

  return (
    <Fragment>
      <ActionBarMemoized
        type="predecessors"
        defaultStepSize={defaultStepSize}
        docCount={predecessorCount}
        docCountAvailable={predecessors.length}
        onChangeCount={onChangeCount}
        isLoading={arePredecessorsLoading}
        isDisabled={!isAnchorLoaded}
      />
      {loadingFeedback()}
      <EuiHorizontalRule margin="xs" />
      {isLegacy && isAnchorLoaded && (
        <div className="discover-table">
          <DocTableLegacyMemoized {...legacyDocTableProps()} />
        </div>
      )}
      {!isLegacy && (
        <div className="dscDocsGrid">
          <DataGridMemoized {...docTableProps()} />
        </div>
      )}
      <EuiHorizontalRule margin="xs" />
      <ActionBarMemoized
        type="successors"
        defaultStepSize={defaultStepSize}
        docCount={successorCount}
        docCountAvailable={successors.length}
        onChangeCount={onChangeCount}
        isLoading={areSuccessorsLoading}
        isDisabled={!isAnchorLoaded}
      />
    </Fragment>
  );
}
