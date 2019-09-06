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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { ActionBarWarning } from './action_bar_warning';

export type ActionBarType = 'successor' | 'predecessor';

export interface ActionBarProps {
  /**
   * it's the number of documents to be / that were fetched
   */
  count: number;
  /**
   * the number of docs to be added to the current count
   */
  defaultStepSize: number;
  /**
   * is true while the anchor of disovers context is fetched
   */
  isDisabled: boolean;
  /**
   * is true when list entries are fetched
   */
  isLoading: boolean;
  /**
   * is executed when the input containing count is changed
   * @param count
   */
  onChangeCount: (count: number) => void;
  /**
   * is executed the 'Load' button is clicked
   */
  onLoadMoreClick: () => void;
  /**
   * just a note how predecssor and successor types are used
   * predecessor bar + list entries | anchor record | successor list entries + bar
   */
  type: ActionBarType;
  /**
   * displayed when less documents then count are available
   */
  warning: boolean;
  warningDocCount?: number;
}

export function ActionBar({
  count,
  defaultStepSize = 5,
  isDisabled,
  isLoading,
  onChangeCount,
  onLoadMoreClick,
  type,
  warning,
  warningDocCount = 0,
}: ActionBarProps) {
  const isSuccessor = type === 'successor';
  return (
    <>
      {isSuccessor && <EuiSpacer size="s" />}
      {isSuccessor && warning && <ActionBarWarning docCount={warningDocCount} type={type} />}
      {isSuccessor && warning && <EuiSpacer size="s" />}
      <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj={`${type}LoadMoreButton`}
            iconType={isSuccessor ? 'arrowDown' : 'arrowUp'}
            isDisabled={isDisabled}
            isLoading={isLoading}
            onClick={onLoadMoreClick}
            size="s"
          >
            <FormattedMessage id="kbn.context.loadMoreDescription" defaultMessage="Load" />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow>
            <EuiFieldNumber
              aria-label={
                isSuccessor
                  ? i18n.translate('kbn.context.olderDocumentsAriaLabel', {
                      defaultMessage: 'Number of older documents',
                    })
                  : i18n.translate('kbn.context.newerDocumentsAriaLabel', {
                      defaultMessage: 'Number of newer documents',
                    })
              }
              className="cxtSizePicker"
              data-test-subj={`${type}CountPicker`}
              disabled={isDisabled}
              onChange={ev => onChangeCount(Number(ev.target.value))}
              step={defaultStepSize}
              type="number"
              value={count}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow displayOnly>
            {isSuccessor ? (
              <FormattedMessage
                id="kbn.context.olderDocumentsDescription"
                defaultMessage="Older documents"
              />
            ) : (
              <FormattedMessage
                id="kbn.context.newerDocumentsDescription"
                defaultMessage="Newer documents"
              />
            )}
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {!isSuccessor && warning && <ActionBarWarning docCount={warningDocCount} type={type} />}
      {!isSuccessor && <EuiSpacer size="s" />}
    </>
  );
}
