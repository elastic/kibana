/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { EsqlEditorActions } from '../editor_actions_context';
import { useEsqlEditorActions } from '../editor_actions_context';
import { searchPlaceholder } from '../editor_visor';
import { HelpPopover } from './help_popover';
import { MagnifyGradientIcon } from './magnify_gradient_icon';

const showHistoryLabel = i18n.translate('esqlEditor.query.showQueriesLabel', {
  defaultMessage: 'Show recent queries',
});

const hideHistoryLabel = i18n.translate('esqlEditor.query.hideQueriesLabel', {
  defaultMessage: 'Hide recent queries',
});

const addStarredQueryLabel = i18n.translate('esqlEditor.query.querieshistory.addFavoriteTitle', {
  defaultMessage: 'Add ES|QL query to Starred',
});

const removeStarredQueryLabel = i18n.translate(
  'esqlEditor.query.querieshistory.removeFavoriteTitle',
  {
    defaultMessage: 'Remove ES|QL query from Starred',
  }
);

// Uses context when wrapped by EsqlEditorActionsProvider.
// For inline editors (no provider), actions are passed via props.
export function ESQLMenu({
  actions,
  hideHistory,
}: {
  actions?: Partial<EsqlEditorActions>;
  hideHistory?: boolean;
} = {}) {
  const contextActions = useEsqlEditorActions();
  const editorActions = actions ?? contextActions;
  const { euiTheme } = useEuiTheme();
  const onToggleVisor = editorActions?.toggleVisor;
  const onToggleHistory = editorActions?.toggleHistory;
  const onToggleStarredQuery = editorActions?.toggleStarredQuery;
  const historyLabel = editorActions?.isHistoryOpen ? hideHistoryLabel : showHistoryLabel;
  const isStarred = Boolean(editorActions?.isCurrentQueryStarred);
  const starredQueryLabel = isStarred ? removeStarredQueryLabel : addStarredQueryLabel;

  return (
    <EuiFlexGroup
      gutterSize="none"
      alignItems="center"
      justifyContent="center"
      responsive={false}
      css={css`
        border-radius: ${euiTheme.border.radius.small};
        border: ${euiTheme.border.thin};
        background: ${euiTheme.colors.emptyShade};
        padding: ${euiTheme.size.xs};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={searchPlaceholder} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType={MagnifyGradientIcon}
            size="xs"
            aria-label={searchPlaceholder}
            onClick={onToggleVisor}
            isDisabled={!onToggleVisor}
            data-test-subj="esql-menu-button"
            color="text"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={starredQueryLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType={isStarred ? 'starFilled' : 'starEmpty'}
            size="xs"
            aria-label={starredQueryLabel}
            className={!isStarred ? 'cm-favorite-button--empty' : ''}
            onClick={onToggleStarredQuery}
            isDisabled={!editorActions?.canToggleStarredQuery}
            data-test-subj="ESQLEditor-toggle-starred-query-icon"
            color="text"
          />
        </EuiToolTip>
      </EuiFlexItem>
      {!hideHistory && (
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" content={historyLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="clockCounter"
              size="xs"
              aria-label={historyLabel}
              onClick={onToggleHistory}
              isDisabled={!onToggleHistory}
              data-test-subj="ESQLEditor-toggle-query-history-icon"
              color="text"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <HelpPopover
          actions={{
            currentQuery: editorActions?.currentQuery,
            submitEsqlQuery: editorActions?.submitEsqlQuery,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
