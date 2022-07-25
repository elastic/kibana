/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './_action_bar.scss';
import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { ActionBarWarning } from './action_bar_warning';
import { SurrDocType } from '../../services/context';
import { MAX_CONTEXT_SIZE, MIN_CONTEXT_SIZE } from '../../services/constants';

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
   * @param type
   * @param count
   */
  onChangeCount: (type: SurrDocType, count: number) => void;
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
  const isSuccessor = type === SurrDocType.SUCCESSORS;
  const [newDocCount, setNewDocCount] = useState(docCount);
  const canLoadMore = defaultStepSize > 0 || newDocCount !== docCount;
  const isValid = (value: number) => value >= MIN_CONTEXT_SIZE && value <= MAX_CONTEXT_SIZE;
  const onSubmit = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (newDocCount !== docCount && isValid(newDocCount)) {
      onChangeCount(type, newDocCount);
    }
  };
  useEffect(() => {
    if (newDocCount !== docCount && newDocCount === 0) {
      setNewDocCount(docCount);
    }
  }, [docCount, newDocCount]);
  return (
    <form onSubmit={onSubmit}>
      {isSuccessor && <EuiSpacer size="s" />}
      {isSuccessor && showWarning && <ActionBarWarning docCount={docCountAvailable} type={type} />}
      {isSuccessor && showWarning && <EuiSpacer size="s" />}
      <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj={`${type}LoadMoreButton`}
            isDisabled={isDisabled || !canLoadMore}
            isLoading={isLoading}
            onClick={() => {
              const value = newDocCount + defaultStepSize;
              if (isValid(value)) {
                setNewDocCount(value);
                onChangeCount(type, value);
              }
            }}
            flush="right"
          >
            <FormattedMessage id="discover.context.loadButtonLabel" defaultMessage="Load" />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow display="center">
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
              compressed
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
                  onChangeCount(type, newDocCount);
                }
              }}
              type="number"
              value={newDocCount >= 0 ? newDocCount : ''}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow display="center">
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
      {!isSuccessor && showWarning && <ActionBarWarning docCount={docCountAvailable} type={type} />}
      {!isSuccessor && <EuiSpacer size="s" />}
    </form>
  );
}
