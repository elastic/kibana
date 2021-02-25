/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { cloneDeep } from 'lodash';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { EuiHorizontalRule, EuiText, EuiPageContent, EuiPage } from '@elastic/eui';
import { ContextErrorMessage } from '../context_error_message';
import {
  DocTableLegacy,
  DocTableLegacyProps,
} from '../../angular/doc_table/create_doc_table_react';
import { IIndexPattern, IndexPatternField } from '../../../../../data/common/index_patterns';
import { LOADING_STATUS } from './constants';
import { ActionBar, ActionBarProps } from '../../angular/context/components/action_bar/action_bar';
import { TopNavMenuProps } from '../../../../../navigation/public';
import { queryActionsProvider } from '../../angular/context/query';

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

const defaultUiState = {
  status: '',
  reason: '',
  defaultStepSize: 5,
  predecessorCount: 5,
  successorCount: 5,
  predecessorAvailable: 5,
  successorAvailable: 5,
  predecessorStatus: '',
  successorStatus: '',
  useNewFieldsApi: '',
  hits: [],
};
function getDefaultDataState(
  indexPatternId: string,
  sort: any,
  anchorId: string = 'LP8g2HcBw7hdgosZTHIo',
  tieBreaker = '_doc'
) {
  return {
    queryParameters: {
      indexPatternId,
      anchorId,
      sort,
      tieBreakerField: tieBreaker,
    },
    loadingStatus: {
      anchor: LOADING_STATUS.UNINITIALIZED,
      predecessors: LOADING_STATUS.UNINITIALIZED,
      successors: LOADING_STATUS.UNINITIALIZED,
    },
    rows: {
      all: [],
      anchor: null,
      predecessors: [],
      successors: [],
    },
  };
}

const PREDECESSOR_TYPE = 'predecessors';
const SUCCESSOR_TYPE = 'successors';

function isLoading(status: string) {
  return status !== LOADING_STATUS.LOADED && status !== LOADING_STATUS.FAILED;
}

export function ContextAppLegacy(renderProps: ContextAppProps) {
  const [uiState, setUiState] = useState(defaultUiState);
  const [dataState, setDataState] = useState(
    getDefaultDataState(renderProps.indexPattern.id as string, renderProps.sorting)
  );
  const {
    defaultStepSize,
    predecessorAvailable,
    successorAvailable,
    predecessorStatus,
    successorStatus,
  } = renderProps;

  const { successorCount, predecessorCount } = uiState;

  const {
    hits,
    filter,
    sorting,
    columns,
    indexPattern,
    minimumVisibleRows,
    useNewFieldsApi,
  } = renderProps;
  const queryActions = queryActionsProvider();
  useEffect(() => {
    const mutateAbleDataState = cloneDeep(dataState);

    queryActions
      .fetchAllRows(mutateAbleDataState)()
      .then(async () => {
        setDataState(mutateAbleDataState);
      });
  }, [dataState, queryActions]);

  const status = renderProps.status;
  const isLoaded = status === LOADING_STATUS.LOADED;
  const isFailed = status === LOADING_STATUS.FAILED;

  const actionBarProps = (type: string) => {
    const isPredecessorType = type === PREDECESSOR_TYPE;
    return {
      defaultStepSize,
      docCount: isPredecessorType ? predecessorCount : successorCount,
      docCountAvailable: isPredecessorType ? predecessorAvailable : successorAvailable,
      onChangeCount: isPredecessorType
        ? (value) => setUiState({ ...uiState, predecessorCount: value })
        : (value) => setUiState({ ...uiState, successorCount: value }),
      isLoading: isPredecessorType ? isLoading(predecessorStatus) : isLoading(successorStatus),
      type,
      isDisabled: !isLoaded,
    } as ActionBarProps;
  };

  const docTableProps = () => {
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
    if (status === LOADING_STATUS.UNINITIALIZED || status === LOADING_STATUS.LOADING) {
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
