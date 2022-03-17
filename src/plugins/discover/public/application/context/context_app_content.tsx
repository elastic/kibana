/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, Fragment, useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import { CONTEXT_STEP_SETTING, DOC_HIDE_TIME_COLUMN_SETTING } from '../../../common';
import type { DataView } from '../../../../data_views/public';
import { SortDirection } from '../../../../data/public';
import { LoadingStatus } from './services/context_query_state';
import { ActionBar } from './components/action_bar/action_bar';
import { DiscoverGrid } from '../../components/discover_grid/discover_grid';
import { DocViewFilterFn } from '../../services/doc_views/doc_views_types';
import { AppState } from './services/context_state';
import { SurrDocType } from './services/context';
import { MAX_CONTEXT_SIZE, MIN_CONTEXT_SIZE } from './services/constants';
import { DocTableContext } from '../../components/doc_table/doc_table_context';
import { EsHitRecordList } from '../types';
import { SortPairArr } from '../../components/doc_table/lib/get_sort';
import { ElasticSearchHit } from '../../types';
import { useDiscoverServices } from '../../utils/use_discover_services';

export interface ContextAppContentProps {
  columns: string[];
  onAddColumn: (columnsName: string) => void;
  onRemoveColumn: (columnsName: string) => void;
  onSetColumns: (columnsNames: string[], hideTimeColumn: boolean) => void;
  indexPattern: DataView;
  predecessorCount: number;
  successorCount: number;
  rows: EsHitRecordList;
  predecessors: EsHitRecordList;
  successors: EsHitRecordList;
  anchorStatus: LoadingStatus;
  predecessorsStatus: LoadingStatus;
  successorsStatus: LoadingStatus;
  useNewFieldsApi: boolean;
  isLegacy: boolean;
  setAppState: (newState: Partial<AppState>) => void;
  addFilter: DocViewFilterFn;
}

const controlColumnIds = ['openDetails'];

export function clamp(value: number) {
  return Math.max(Math.min(MAX_CONTEXT_SIZE, value), MIN_CONTEXT_SIZE);
}

const DiscoverGridMemoized = React.memo(DiscoverGrid);
const DocTableContextMemoized = React.memo(DocTableContext);
const ActionBarMemoized = React.memo(ActionBar);

export function ContextAppContent({
  columns,
  onAddColumn,
  onRemoveColumn,
  onSetColumns,
  indexPattern,
  predecessorCount,
  successorCount,
  rows,
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
  const { uiSettings: config } = useDiscoverServices();

  const [expandedDoc, setExpandedDoc] = useState<ElasticSearchHit | undefined>();
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

  const loadingFeedback = () => {
    if (isLegacy && isAnchorLoading) {
      return (
        <EuiText textAlign="center" data-test-subj="contextApp_loadingIndicator">
          <FormattedMessage id="discover.context.loadingDescription" defaultMessage="Loading..." />
        </EuiText>
      );
    }
    return null;
  };

  const onChangeCount = useCallback(
    (type: SurrDocType, count: number) => {
      const countKey = type === SurrDocType.SUCCESSORS ? 'successorCount' : 'predecessorCount';
      setAppState({ [countKey]: clamp(count) });
    },
    [setAppState]
  );
  const sort = useMemo(() => {
    return [[indexPattern.timeFieldName!, SortDirection.desc]];
  }, [indexPattern]);

  return (
    <Fragment>
      <ActionBarMemoized
        type={SurrDocType.PREDECESSORS}
        defaultStepSize={defaultStepSize}
        docCount={predecessorCount}
        docCountAvailable={predecessors.length}
        onChangeCount={onChangeCount}
        isLoading={arePredecessorsLoading}
        isDisabled={isAnchorLoading}
      />
      {loadingFeedback()}
      <EuiHorizontalRule margin="xs" />
      {isLegacy && rows && rows.length !== 0 && (
        <DocTableContextMemoized
          columns={columns}
          indexPattern={indexPattern}
          rows={rows}
          isLoading={isAnchorLoading}
          onFilter={addFilter}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
          sort={sort}
          useNewFieldsApi={useNewFieldsApi}
          dataTestSubj="contextDocTable"
        />
      )}
      {!isLegacy && (
        <div className="dscDocsGrid">
          <DiscoverGridMemoized
            ariaLabelledBy="surDocumentsAriaLabel"
            columns={columns}
            rows={rows}
            indexPattern={indexPattern}
            expandedDoc={expandedDoc}
            isLoading={isAnchorLoading}
            sampleSize={0}
            sort={sort as SortPairArr[]}
            isSortEnabled={false}
            showTimeCol={showTimeCol}
            useNewFieldsApi={useNewFieldsApi}
            isPaginationEnabled={false}
            controlColumnIds={controlColumnIds}
            setExpandedDoc={setExpandedDoc}
            onFilter={addFilter}
            onAddColumn={onAddColumn}
            onRemoveColumn={onRemoveColumn}
            onSetColumns={onSetColumns}
          />
        </div>
      )}
      <EuiHorizontalRule margin="xs" />
      <ActionBarMemoized
        type={SurrDocType.SUCCESSORS}
        defaultStepSize={defaultStepSize}
        docCount={successorCount}
        docCountAvailable={successors.length}
        onChangeCount={onChangeCount}
        isLoading={areSuccessorsLoading}
        isDisabled={isAnchorLoading}
      />
    </Fragment>
  );
}
