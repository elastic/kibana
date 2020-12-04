/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
import { LOADING_STATUS } from './constants';
import { ActionBar, ActionBarProps } from '../../angular/context/components/action_bar/action_bar';

export interface ContextAppProps {
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
}

const PREDECESSOR_TYPE = 'predecessors';
const SUCCESSOR_TYPE = 'successors';

function isLoading(status: string) {
  return status !== LOADING_STATUS.LOADED && status !== LOADING_STATUS.FAILED;
}

export function ContextAppLegacy(renderProps: ContextAppProps) {
  const status = renderProps.status;
  const isLoaded = status === LOADING_STATUS.LOADED;
  const isFailed = status === LOADING_STATUS.FAILED;

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
    const { hits, filter, sorting, columns, indexPattern, minimumVisibleRows } = renderProps;
    return {
      columns,
      indexPattern,
      minimumVisibleRows,
      rows: hits,
      onFilter: filter,
      sort: sorting.map((el) => [el]),
    } as DocTableLegacyProps;
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
      )}
    </I18nProvider>
  );
}
