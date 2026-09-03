/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { Suspense, useRef, useState } from 'react';
import { EuiButtonGroup, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import { StardustWrapper } from '@kbn/content-management-favorites-public';
import { useEsqlEditorActions } from '../editor_actions_context';
import { searchPlaceholder } from '../editor_visor';
import { useNlToEsqlCheck } from '../hooks/use_nl_to_esql_check';
import { MagnifySparklesIcon } from './magnify_sparkles_icon';
import {
  addStarredQueryLabel,
  helpLabel,
  hideHistoryLabel,
  searchTooltipLabel,
  searchWithNlTooltipLabel,
  removeStarredQueryLabel,
  showHistoryLabel,
} from './menu_i18n';

const LazyHelpPopover = React.lazy(async () => {
  const module = await import('./help_popover');
  return { default: module.HelpPopover };
});

export function ESQLMenu({
  hideHistory,
  onESQLDocsFlyoutVisibilityChanged,
}: {
  hideHistory?: boolean;
  onESQLDocsFlyoutVisibilityChanged?: (isOpen: boolean) => void;
} = {}) {
  const editorActions = useEsqlEditorActions();
  const isNlToEsqlEnabled = useNlToEsqlCheck();
  const commandKey = isMac ? '⌘' : 'Ctrl';
  const visorTooltip = isNlToEsqlEnabled
    ? searchWithNlTooltipLabel(commandKey)
    : searchTooltipLabel(commandKey);
  const onToggleVisor = editorActions?.toggleVisor;
  const onToggleHistory = editorActions?.toggleHistory;
  const onToggleStarredQuery = editorActions?.toggleStarredQuery;
  const historyLabel = editorActions?.isHistoryOpen ? hideHistoryLabel : showHistoryLabel;
  const isStarred = Boolean(editorActions?.isCurrentQueryStarred);
  const starredQueryLabel = isStarred ? removeStarredQueryLabel : addStarredQueryLabel;

  const [showStardust, setShowStardust] = useState(false);
  const wasStarredRef = useRef(isStarred);
  if (isStarred && !wasStarredRef.current) {
    setShowStardust(true);
  } else if (!isStarred && wasStarredRef.current) {
    setShowStardust(false);
  }
  wasStarredRef.current = isStarred;

  return (
    <EuiButtonGroup
      variant="segmented"
      legend={i18n.translate('esqlEditor.menu.legend', {
        defaultMessage: 'ES|QL editor actions',
      })}
      buttonSize="s"
    >
      <EuiToolTip position="top" content={visorTooltip} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType={isNlToEsqlEnabled ? MagnifySparklesIcon : 'magnify'}
          aria-label={searchPlaceholder}
          onClick={onToggleVisor}
          isDisabled={!onToggleVisor}
          data-test-subj="esql-menu-button"
        />
      </EuiToolTip>
      {!hideHistory && (
        <EuiToolTip position="top" content={starredQueryLabel} disableScreenReaderOutput>
          <StardustWrapper active={showStardust}>
            <EuiButtonIcon
              iconType={isStarred ? 'starFill' : 'star'}
              aria-label={starredQueryLabel}
              className={!isStarred ? 'cm-favorite-button--empty' : ''}
              onClick={onToggleStarredQuery}
              isDisabled={!editorActions?.canToggleStarredQuery}
              data-test-subj="ESQLEditor-toggle-starred-query-icon"
            />
          </StardustWrapper>
        </EuiToolTip>
      )}
      {!hideHistory && (
        <EuiToolTip position="top" content={historyLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="clockCounter"
            aria-label={historyLabel}
            onClick={(e: React.MouseEvent) => {
              onToggleHistory?.();
              (e.currentTarget as HTMLElement).blur();
            }}
            isDisabled={!onToggleHistory}
            data-test-subj="ESQLEditor-toggle-query-history-icon"
          />
        </EuiToolTip>
      )}
      <Suspense
        fallback={
          <EuiToolTip position="top" content={helpLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="question"
              aria-label={helpLabel}
              data-test-subj="esql-help-popover-button"
              isDisabled
            />
          </EuiToolTip>
        }
      >
        <LazyHelpPopover onESQLDocsFlyoutVisibilityChanged={onESQLDocsFlyoutVisibilityChanged} />
      </Suspense>
    </EuiButtonGroup>
  );
}
