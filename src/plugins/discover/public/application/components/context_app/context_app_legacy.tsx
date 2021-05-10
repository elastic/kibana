/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { EuiHorizontalRule, EuiText, EuiPageContent, EuiPage } from '@elastic/eui';
import { ContextErrorMessage } from '../context_error_message';
import {
  DocTableLegacy,
  DocTableLegacyProps,
} from '../../angular/doc_table/create_doc_table_react';
import { IIndexPattern, IndexPatternField } from '../../../../../data/common/index_patterns';
import { LoadingStatus } from '../../angular/context_app_state';
import { ActionBar, ActionBarProps } from '../../angular/context/components/action_bar/action_bar';
import { TopNavMenuProps } from '../../../../../navigation/public';

export interface ContextAppProps {
  topNavMenu: React.ComponentType<TopNavMenuProps>;
  columns: string[];
  hits: Array<Record<string, unknown>>;
  indexPattern: IIndexPattern;
  filter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  minimumVisibleRows: number;
  sorting: string[];
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

const PREDECESSOR_TYPE = 'predecessors';
const SUCCESSOR_TYPE = 'successors';

function isLoading(status: string) {
  return status !== LoadingStatus.LOADED && status !== LoadingStatus.FAILED;
}

export function ContextAppLegacy(renderProps: ContextAppProps) {
  const status = renderProps.status;
  const isLoaded = status === LoadingStatus.LOADED;
  const isFailed = status === LoadingStatus.FAILED;

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
          <EuiPage>
            <EuiPageContent paddingSize="s" className="dscCxtAppContent">
              <ActionBar {...actionBarProps(PREDECESSOR_TYPE)} />
              {loadingFeedback()}
              <EuiHorizontalRule margin="xs" />
              {isLoaded ? (
                <div className="discover-table">
                  <DocTableLegacy {...docTableProps()} />
                </div>
              ) : null}
              <EuiHorizontalRule margin="xs" />
              <ActionBar {...actionBarProps(SUCCESSOR_TYPE)} />
            </EuiPageContent>
          </EuiPage>
        </div>
      )}
    </I18nProvider>
  );
}
