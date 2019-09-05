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
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldNumber,
  EuiSpacer,
} from '@elastic/eui';

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
}: {
  count: number;
  defaultStepSize: number;
  isDisabled: boolean;
  isLoading: boolean;
  onChangeCount: (count: number) => void;
  onLoadMoreClick: () => void;
  type: 'successor' | 'predecessor';
  warning: boolean;
  warningDocCount?: number;
}) {
  return (
    <>
      {type === 'successor' && <EuiSpacer size="s" />}
      {type === 'successor' && warning && (
        <>
          <EuiCallOut
            color="warning"
            data-test-subj="successorWarningMsg"
            iconType="bolt"
            title={
              warningDocCount === 0 ? (
                <FormattedMessage
                  id="kbn.context.newerDocumentsWarningZero"
                  defaultMessage="No documents newer than the anchor could be found."
                />
              ) : (
                <FormattedMessage
                  id="kbn.context.newerDocumentsWarning"
                  defaultMessage="Only {warningDocCount} documents newer than the anchor could be found."
                  values={{ warningDocCount }}
                />
              )
            }
            size="s"
          />
          <EuiSpacer size="s" />
        </>
      )}
      <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj={
              type === 'predecessor' ? 'predecessorLoadMoreButton' : 'successorLoadMoreButton'
            }
            disabled={isDisabled}
            iconType={type === 'predecessor' ? 'arrowUp' : 'arrowDown'}
            isLoading={isLoading}
            onClick={onLoadMoreClick}
            size="s"
          >
            <FormattedMessage
              id="kbn.context.loadMoreDescription"
              defaultMessage="Load {defaultStepSize} more"
              values={{ defaultStepSize }}
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow>
            <EuiFieldNumber
              aria-label={
                type === 'successor'
                  ? i18n.translate('kbn.context.olderDocumentsAriaLabel', {
                      defaultMessage: 'Number of older documents',
                    })
                  : i18n.translate('kbn.context.newerDocumentsAriaLabel', {
                      defaultMessage: 'Number of newer documents',
                    })
              }
              className="cxtSizePicker"
              data-test-subj={
                type === 'successor' ? 'successorCountPicker' : 'predecessorCountPicker'
              }
              disabled={isDisabled}
              onChange={ev => onChangeCount(Number(ev.target.value))}
              type="number"
              value={count}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow displayOnly>
            {type === 'successor' ? (
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
      {type === 'predecessor' && warning && (
        <EuiCallOut
          color="warning"
          data-test-subj="predecessorWarningMsg"
          iconType="bolt"
          title={
            warningDocCount === 0 ? (
              <FormattedMessage
                id="kbn.context.olderDocumentsWarningZero"
                defaultMessage="No documents older than the anchor could be found."
              />
            ) : (
              <FormattedMessage
                id="kbn.context.olderDocumentsWarning"
                defaultMessage="Only {warningDocCount} documents older than the anchor could be found."
                values={{ warningDocCount }}
              />
            )
          }
          size="s"
        />
      )}
      {type === 'predecessor' && <EuiSpacer size="s" />}
    </>
  );
}
