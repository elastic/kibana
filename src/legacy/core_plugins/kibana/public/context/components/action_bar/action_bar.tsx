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
import React, { useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
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
import { SurrDocType } from '../../api/context';

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
   * is triggered the 'Load' button is clicked
   */
  onLoadMoreClick: () => void;
  /**
   * can be `predecessors` or `successors`, usage in context:
   * predecessors action bar + records
   * anchor record
   * successors records + action bar
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
  onLoadMoreClick,
  type,
}: ActionBarProps) {
  const showWarning = !isDisabled && !isLoading && docCountAvailable < docCount;
  const isSuccessor = type === 'successors';
  const [newDocCount, setNewDocCount] = useState(docCount);
  const onChangeDebouncedRef = useRef(debounce((val: number) => onChangeCount(val), 500));

  return (
    <>
      {isSuccessor && <EuiSpacer size="s" />}
      {isSuccessor && showWarning && <ActionBarWarning docCount={docCountAvailable} type={type} />}
      {isSuccessor && showWarning && <EuiSpacer size="s" />}
      <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj={`${type}LoadMoreButton`}
            iconType={isSuccessor ? 'arrowDown' : 'arrowUp'}
            isDisabled={isDisabled}
            isLoading={isLoading}
            onClick={() => {
              onLoadMoreClick();
              setNewDocCount(newDocCount + defaultStepSize);
            }}
            flush="right"
          >
            <FormattedMessage id="kbn.context.loadButtonLabel" defaultMessage="Load" />
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
              onChange={ev => {
                const value = ev.target.valueAsNumber;
                setNewDocCount(value);
                if (value >= 0) {
                  onChangeDebouncedRef.current(value);
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
                id="kbn.context.olderDocumentsDescription"
                defaultMessage="older documents"
              />
            ) : (
              <FormattedMessage
                id="kbn.context.newerDocumentsDescription"
                defaultMessage="newer documents"
              />
            )}
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {!isSuccessor && showWarning && <ActionBarWarning docCount={docCountAvailable} type={type} />}
      {!isSuccessor && <EuiSpacer size="s" />}
    </>
  );
}
