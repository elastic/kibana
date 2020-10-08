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
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { ActionBarWarning } from './action_bar_warning';
import { SurrDocType } from '../../api/context';
import { MAX_CONTEXT_SIZE, MIN_CONTEXT_SIZE } from '../../query_parameters/constants';

export interface ActionBarProps {
  /**
   *  the number of documents fetched initially and added when the load button is clicked
   */
  defaultStepSize: number;
  /**
   * the number of docs to be displayed
   */
  docCount: number;
  /**
   *  the number of documents that are  available
   *  display warning when it's lower than docCount
   */
  docCountAvailable: number;
  /**
   * is true while the anchor record is fetched
   */
  isDisabled: boolean;
  /**
   * is true when list entries are fetched
   */
  isLoading: boolean;
  /**
   * is triggered when the input containing count is changed
   * @param count
   */
  onChangeCount: (count: number) => void;
  /**
   * can be `predecessors` or `successors`, usage in context:
   * predecessors action bar + records (these are newer records)
   * anchor record
   * successors records + action bar (these are older records)
   */
  type: SurrDocType;
}

export function ActionBar({
  defaultStepSize,
  docCount,
  docCountAvailable,
  isDisabled,
  isLoading,
  onChangeCount,
  type,
}: ActionBarProps) {
  const showWarning = !isDisabled && !isLoading && docCountAvailable < docCount;
  const isSuccessor = type === 'successors';
  const [newDocCount, setNewDocCount] = useState(docCount);
  const isValid = (value: number) => value >= MIN_CONTEXT_SIZE && value <= MAX_CONTEXT_SIZE;
  const onSubmit = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (newDocCount !== docCount && isValid(newDocCount)) {
      onChangeCount(newDocCount);
    }
  };

  return (
    <I18nProvider>
      <form onSubmit={onSubmit}>
        {isSuccessor && <EuiSpacer size="s" />}
        {isSuccessor && showWarning && (
          <ActionBarWarning docCount={docCountAvailable} type={type} />
        )}
        {isSuccessor && showWarning && <EuiSpacer size="s" />}
        <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={`${type}LoadMoreButton`}
              iconType={isSuccessor ? 'arrowDown' : 'arrowUp'}
              isDisabled={isDisabled}
              isLoading={isLoading}
              onClick={() => {
                const value = newDocCount + defaultStepSize;
                if (isValid(value)) {
                  setNewDocCount(value);
                  onChangeCount(value);
                }
              }}
              flush="right"
            >
              <FormattedMessage id="discover.context.loadButtonLabel" defaultMessage="Load" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiFieldNumber
                aria-label={
                  isSuccessor
                    ? i18n.translate('discover.context.olderDocumentsAriaLabel', {
                        defaultMessage: 'Number of older documents',
                      })
                    : i18n.translate('discover.context.newerDocumentsAriaLabel', {
                        defaultMessage: 'Number of newer documents',
                      })
                }
                className="cxtSizePicker"
                data-test-subj={`${type}CountPicker`}
                disabled={isDisabled}
                min={MIN_CONTEXT_SIZE}
                max={MAX_CONTEXT_SIZE}
                onChange={(ev) => {
                  setNewDocCount(ev.target.valueAsNumber);
                }}
                onBlur={() => {
                  if (newDocCount !== docCount && isValid(newDocCount)) {
                    onChangeCount(newDocCount);
                  }
                }}
                type="number"
                value={newDocCount >= 0 ? newDocCount : ''}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow displayOnly>
              {isSuccessor ? (
                <FormattedMessage
                  id="discover.context.olderDocumentsDescription"
                  defaultMessage="older documents"
                />
              ) : (
                <FormattedMessage
                  id="discover.context.newerDocumentsDescription"
                  defaultMessage="newer documents"
                />
              )}
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        {!isSuccessor && showWarning && (
          <ActionBarWarning docCount={docCountAvailable} type={type} />
        )}
        {!isSuccessor && <EuiSpacer size="s" />}
      </form>
    </I18nProvider>
  );
}
