/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import './context_app_legacy.scss';
import { EuiHorizontalRule, EuiText, EuiPageContent, EuiPage } from '@elastic/eui';
import { IUiSettingsClient } from 'kibana/public';
import { ContextErrorMessage } from '../context_error_message';
import {
  DocTableLegacy,
  DocTableLegacyProps,
} from '../../angular/doc_table/create_doc_table_react';
import { IIndexPattern, IndexPatternField } from '../../../../../data/common/index_patterns';
import { LoadingStatus } from '../../angular/context_app_state';
import { ActionBar, ActionBarProps } from '../../angular/context/components/action_bar/action_bar';
import { TopNavMenuProps } from '../../../../../navigation/public';
import { DiscoverGrid, DiscoverGridProps } from '../discover_grid/discover_grid';
import { SortPairArr } from '../../angular/doc_table/lib/get_sort';
import { DiscoverServices } from '../../../build_services';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';

export interface ContextAppProps {
  topNavMenu: React.ComponentType<TopNavMenuProps>;
  columns: string[];
  hits: ElasticSearchHit[];
  indexPattern: IIndexPattern;
  opts: {
    config: IUiSettingsClient;
    services: DiscoverServices;
  };
  filter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  minimumVisibleRows: number;
  sorting: SortPairArr[];
  status: string;
  reason: string;
  defaultStepSize: number;
  predecessorCount: number;
  successorCount: number;
  predecessorAvailable: number;
  successorAvailable: number;
  onChangePredecessorCount: (count: number) => void;
  onChangeSuccessorCount: (count: number) => void;
  predecessorStatus: string;
  successorStatus: string;
  useNewFieldsApi?: boolean;
}

const DataGridMemoized = React.memo(DiscoverGrid);
const PREDECESSOR_TYPE = 'predecessors';
const SUCCESSOR_TYPE = 'successors';

function isLoading(status: string) {
  return status !== LoadingStatus.LOADED && status !== LoadingStatus.FAILED;
}

export function ContextAppLegacy(renderProps: ContextAppProps) {
  const [expandedDoc, setExpandedDoc] = useState<ElasticSearchHit | undefined>(undefined);
  const status = renderProps.status;
  const isLoaded = status === LoadingStatus.LOADED;
  const isFailed = status === LoadingStatus.FAILED;
  const isLegacy = renderProps.opts.config.get('doc_table:legacy');

  const actionBarProps = (type: string) => {
    const {
      defaultStepSize,
      successorCount,
      predecessorCount,
      predecessorAvailable,
      successorAvailable,
      predecessorStatus,
      successorStatus,
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
      isDisabled: !isLoaded,
    } as ActionBarProps;
  };

  const docTableProps = () => {
    const {
      columns,
      hits,
      filter,
      indexPattern,
      sorting,
      opts: { config, services },
      useNewFieldsApi,
    } = renderProps;
    return {
      ariaLabelledBy: 'surDocumentsAriaLabel',
      columns,
      rows: hits,
      indexPattern,
      expandedDoc,
      isLoading: isLoading(status),
      sampleSize: 0,
      sort: sorting,
      showTimeCol: !config.get('doc_table:hideTimeColumn', false) && !!indexPattern.timeFieldName,
      services,
      useNewFieldsApi,
      setExpandedDoc,
      onFilter: filter,
      onAddColumn: (column) => {},
      onRemoveColumn: (column) => {},
      onSetColumns: (columnsToSet) => {},
      onSort: (sort) => {},
    } as DiscoverGridProps;
  };

  const legacyDocTableProps = () => {
    const {
      hits,
      filter,
      sorting,
      columns,
      indexPattern,
      minimumVisibleRows,
      useNewFieldsApi,
    } = renderProps;
    // @ts-expect-error doesn't implement full DocTableLegacyProps interface
    return {
      columns,
      indexPattern,
      minimumVisibleRows,
      rows: hits,
      onFilter: filter,
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
    if (status === LoadingStatus.UNINITIALIZED || status === LoadingStatus.LOADING) {
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
        <ContextErrorMessage status={status} reason={renderProps.reason} />
      ) : (
        <div>
          <TopNavMenu {...getNavBarProps()} />
          <EuiPage className={isLegacy ? '' : 'dscSurrDocsPage'}>
            <EuiPageContent paddingSize="s" className="dscSurrDocsContent">
              <ActionBar {...actionBarProps(PREDECESSOR_TYPE)} />
              {loadingFeedback()}
              <EuiHorizontalRule margin="xs" />
              {isLegacy ? (
                <div className="discover-table">
                  <DocTableLegacy {...legacyDocTableProps()} />
                </div>
              ) : (
                <div className="dscSurrDocsGrid">
                  <DataGridMemoized {...docTableProps()} />
                </div>
              )}
              <EuiHorizontalRule margin="xs" />
              <ActionBar {...actionBarProps(SUCCESSOR_TYPE)} />
            </EuiPageContent>
          </EuiPage>
        </div>
      )}
    </I18nProvider>
  );
}
