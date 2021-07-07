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
import { IndexPattern } from '../../../../../data/common';
import { SortDirection } from '../../../../../data/public';
import { LoadingStatus } from '../../angular/context_query_state';
import { ActionBar } from '../../angular/context/components/action_bar/action_bar';
import { DiscoverGrid } from '../discover_grid/discover_grid';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { AppState } from '../../angular/context_state';
import { EsHitRecordList, SurrDocType } from '../../angular/context/api/context';
import { DiscoverServices } from '../../../build_services';
import { MAX_CONTEXT_SIZE, MIN_CONTEXT_SIZE } from './utils/constants';
import { DocTableRow } from '../../angular/doc_table/components/table_row';
import { DocTable } from '../../angular/doc_table/doc_table';

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
  addFilter: DocViewFilterFn;
}

const controlColumnIds = ['openDetails'];

export function clamp(value: number) {
  return Math.max(Math.min(MAX_CONTEXT_SIZE, value), MIN_CONTEXT_SIZE);
}

const DiscoverGridMemoized = React.memo(DiscoverGrid);
const DocTableMemoized = React.memo(DocTable);
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

  const [expandedDoc, setExpandedDoc] = useState<ElasticSearchHit | undefined>();
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
    (type: SurrDocType, count: number) => {
      const countKey = type === SurrDocType.SUCCESSORS ? 'successorCount' : 'predecessorCount';
      setAppState({ [countKey]: clamp(count) });
    },
    [setAppState]
  );

  return (
    <Fragment>
      <ActionBarMemoized
        type={SurrDocType.PREDECESSORS}
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
          <DocTableMemoized
            columns={columns}
            indexPattern={indexPattern}
            rows={rows as DocTableRow[]}
            type="context"
            onFilter={addFilter}
            onAddColumn={onAddColumn}
            onRemoveColumn={onRemoveColumn}
            sort={sort}
            useNewFieldsApi={useNewFieldsApi}
            dataTestSubj="contextDocTable"
          />
        </div>
      )}
      {!isLegacy && (
        <div className="dscDocsGrid">
          <DiscoverGridMemoized
            ariaLabelledBy="surDocumentsAriaLabel"
            columns={columns}
            rows={rows as ElasticSearchHit[]}
            indexPattern={indexPattern}
            expandedDoc={expandedDoc}
            isLoading={isAnchorLoading}
            sampleSize={0}
            sort={sort as [[string, SortDirection]]}
            isSortEnabled={false}
            showTimeCol={showTimeCol}
            services={services}
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
        isDisabled={!isAnchorLoaded}
      />
    </Fragment>
  );
}
