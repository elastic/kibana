/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, Fragment } from 'react';
import classNames from 'classnames';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import './context_app_legacy.scss';
import { EuiHorizontalRule, EuiText, EuiPageContent, EuiPage, EuiSpacer } from '@elastic/eui';
import { DOC_HIDE_TIME_COLUMN_SETTING, DOC_TABLE_LEGACY } from '../../../../common';
import { ContextErrorMessage } from '../context_error_message';
import {
  DocTableLegacy,
  DocTableLegacyProps,
} from '../../angular/doc_table/create_doc_table_react';
import { IndexPattern } from '../../../../../data/common/index_patterns';
import { LoadingStatus } from '../../angular/context_app_state';
import { ActionBar, ActionBarProps } from '../../angular/context/components/action_bar/action_bar';
import { TopNavMenuProps } from '../../../../../navigation/public';
import { DiscoverGrid, DiscoverGridProps } from '../discover_grid/discover_grid';
import { DocViewFilterFn } from '../../doc_views/doc_views_types';
import { getServices, SortDirection } from '../../../kibana_services';
import { GetStateReturn, AppState } from '../../angular/context_state';
import { useDataGridColumns } from '../../helpers/use_data_grid_columns';
import { EsHitRecord, EsHitRecordList } from '../../angular/context/api/context';

export interface ContextAppProps {
  topNavMenu: React.ComponentType<TopNavMenuProps>;
  columns: string[];
  hits: EsHitRecordList;
  indexPattern: IndexPattern;
  appState: AppState;
  stateContainer: GetStateReturn;
  filter: DocViewFilterFn;
  minimumVisibleRows: number;
  sorting: Array<[string, SortDirection]>;
  anchorId: string;
  anchorStatus: string;
  anchorReason: string;
  predecessorStatus: string;
  successorStatus: string;
  defaultStepSize: number;
  predecessorCount: number;
  successorCount: number;
  predecessorAvailable: number;
  successorAvailable: number;
  onChangePredecessorCount: (count: number) => void;
  onChangeSuccessorCount: (count: number) => void;
  useNewFieldsApi?: boolean;
}

const DataGridMemoized = React.memo(DiscoverGrid);
const PREDECESSOR_TYPE = 'predecessors';
const SUCCESSOR_TYPE = 'successors';

function isLoading(status: string) {
  return status !== LoadingStatus.LOADED && status !== LoadingStatus.FAILED;
}

export function ContextAppLegacy(renderProps: ContextAppProps) {
  const services = getServices();
  const { uiSettings: config, capabilities, indexPatterns } = services;
  const {
    indexPattern,
    anchorId,
    anchorStatus,
    predecessorStatus,
    successorStatus,
    appState,
    stateContainer,
    hits: rows,
    sorting,
    filter,
    minimumVisibleRows,
    useNewFieldsApi,
  } = renderProps;
  const [expandedDoc, setExpandedDoc] = useState<EsHitRecord | undefined>(undefined);
  const isAnchorLoaded = anchorStatus === LoadingStatus.LOADED;
  const isFailed = anchorStatus === LoadingStatus.FAILED;
  const isLegacy = config.get(DOC_TABLE_LEGACY);

  const { columns, onAddColumn, onRemoveColumn, onSetColumns } = useDataGridColumns({
    capabilities,
    config,
    indexPattern,
    indexPatterns,
    setAppState: stateContainer.setAppState,
    state: appState,
    useNewFieldsApi: !!useNewFieldsApi,
  });

  const actionBarProps = (type: string) => {
    const {
      defaultStepSize,
      successorCount,
      predecessorCount,
      predecessorAvailable,
      successorAvailable,
      onChangePredecessorCount,
      onChangeSuccessorCount,
    } = renderProps;
    const isPredecessorType = type === PREDECESSOR_TYPE;
    return {
      defaultStepSize,
      docCount: isPredecessorType ? predecessorCount : successorCount,
      docCountAvailable: isPredecessorType ? predecessorAvailable : successorAvailable,
      onChangeCount: isPredecessorType ? onChangePredecessorCount : onChangeSuccessorCount,
      isLoading: isPredecessorType ? isLoading(predecessorStatus) : isLoading(successorStatus),
      type,
      isDisabled: !isAnchorLoaded,
    } as ActionBarProps;
  };

  const docTableProps = () => {
    return {
      ariaLabelledBy: 'surDocumentsAriaLabel',
      columns,
      rows,
      indexPattern,
      expandedDoc,
      isLoading: isLoading(anchorStatus),
      sampleSize: 0,
      sort: sorting,
      isSortEnabled: false,
      showTimeCol: !config.get(DOC_HIDE_TIME_COLUMN_SETTING, false) && !!indexPattern.timeFieldName,
      services,
      useNewFieldsApi,
      isPaginationEnabled: false,
      controlColumnIds: ['openDetails'],
      setExpandedDoc,
      onFilter: filter,
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
      minimumVisibleRows,
      rows,
      onFilter: filter,
      onAddColumn,
      onRemoveColumn,
      sort: sorting.map((el) => [el]),
      useNewFieldsApi,
    } as DocTableLegacyProps;
  };

  const TopNavMenu = renderProps.topNavMenu;
  const getNavBarProps = () => {
    return {
      appName: 'context',
      showSearchBar: true,
      showQueryBar: false,
      showFilterBar: true,
      showSaveQuery: false,
      showDatePicker: false,
      indexPatterns: [renderProps.indexPattern],
      useDefaultBehaviors: true,
    };
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
    <I18nProvider>
      {isFailed ? (
        <ContextErrorMessage status={anchorStatus} reason={renderProps.anchorReason} />
      ) : (
        <Fragment>
          <TopNavMenu {...getNavBarProps()} />
          <EuiPage className={classNames({ dscDocsPage: !isLegacy })}>
            <EuiPageContent paddingSize="s" className="dscDocsContent">
              <EuiSpacer size="s" />
              <EuiText>
                <strong>
                  <FormattedMessage
                    id="discover.context.contextOfTitle"
                    defaultMessage="Documents surrounding #{anchorId}"
                    values={{ anchorId }}
                  />
                </strong>
              </EuiText>
              <EuiSpacer size="s" />
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
            </EuiPageContent>
          </EuiPage>
        </Fragment>
      )}
    </I18nProvider>
  );
}
