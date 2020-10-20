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
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n/react';
import {
  DocTableLegacy,
  DocTableLegacyProps,
} from '../../angular/doc_table/create_doc_table_react';
import { IIndexPattern, IndexPatternField } from '../../../../../data/common/index_patterns';
import { LOADING_STATUS } from './constants';

export interface ContextAppProps {
  columns: string[];
  hits: Array<Record<string, unknown>>;
  indexPattern: IIndexPattern;
  filter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  minimumVisibleRows: number;
  sorting: string[];
  status: string;
}

export function ContextAppLegacy(renderProps: ContextAppProps) {
  const { hits, filter, sorting, status } = renderProps;
  const props = ({ ...renderProps } as unknown) as DocTableLegacyProps;
  props.rows = hits;
  props.onFilter = filter;
  props.sort = sorting.map((el) => [el]);
  const isLoaded = status === LOADING_STATUS.LOADED;
  const loadingFeedback = () => {
    if (status === LOADING_STATUS.UNINITIALIZED || status === LOADING_STATUS.LOADING) {
      return (
        <EuiPanel paddingSize="l" data-test-subj="contextApp_loadingIndicator">
          <EuiText textAlign="center">
            <FormattedMessage
              id="discover.context.loadingDescription"
              defaultMessage="Loading..."
            />
          </EuiText>
        </EuiPanel>
      );
    }
    return null;
  };
  return (
    <I18nProvider>
      <React.Fragment>
        {loadingFeedback()}
        {isLoaded ? (
          <EuiPanel paddingSize="none">
            <div className="discover-table">
              <DocTableLegacy {...props} />
            </div>
          </EuiPanel>
        ) : null}
      </React.Fragment>
    </I18nProvider>
  );
}
