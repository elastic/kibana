/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef } from 'react';
import { EuiTextArea, EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  internalStateActions,
  useInternalStateDispatch,
  useCurrentTabAction,
  useCurrentTabSelector,
} from '../../state_management/redux';

const containerStyles = css({
  padding: '8px',
  marginBottom: '8px',
  borderBottom: '1px solid var(--euiColorLightShade)',
  flexShrink: 0,
});

const textAreaStyles = css({
  resize: 'vertical',
  minHeight: 40,
  maxHeight: 200,
  fontFamily: 'inherit',
  fontSize: 13,
});

export const TabComment: React.FC = React.memo(() => {
  const comment = useCurrentTabSelector((tab) => tab.uiState.comment);
  const dispatch = useInternalStateDispatch();
  const setCommentUiState = useCurrentTabAction(internalStateActions.setCommentUiState);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        dispatch(setCommentUiState({ comment: value }));
      }, 300);
    },
    [dispatch, setCommentUiState]
  );

  const onRemove = useCallback(() => {
    clearTimeout(debounceRef.current);
    dispatch(setCommentUiState({ comment: undefined }));
  }, [dispatch, setCommentUiState]);

  if (typeof comment !== 'string') return null;

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="flexStart"
      responsive={false}
      css={containerStyles}
    >
      <EuiFlexItem>
        <EuiTextArea
          compressed
          fullWidth
          rows={2}
          defaultValue={comment}
          onChange={onChange}
          placeholder={i18n.translate('discover.tabs.commentPlaceholder', {
            defaultMessage: 'Add a comment for this tab…',
          })}
          css={textAreaStyles}
          data-test-subj="discoverTabComment"
          aria-label={i18n.translate('discover.tabs.commentAriaLabel', {
            defaultMessage: 'Tab comment',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('discover.tabs.removeCommentTooltip', {
            defaultMessage: 'Remove comment',
          })}
        >
          <EuiButtonIcon
            iconType="cross"
            color="subdued"
            size="xs"
            onClick={onRemove}
            aria-label={i18n.translate('discover.tabs.removeCommentAriaLabel', {
              defaultMessage: 'Remove comment',
            })}
            data-test-subj="discoverTabCommentRemove"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
