/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { Suspense, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
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

const CONTROL_GROUP_CLASS = 'unifiedDataTableToolbarControlGroup';
const CONTROL_ICON_BUTTON_CLASS = 'unifiedDataTableToolbarControlIconButton';

function EsqlMenuIconButton({ children }: { children: React.ReactNode }) {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      className={CONTROL_ICON_BUTTON_CLASS}
      css={css`
        .euiToolTipAnchor .euiButtonIcon {
          inline-size: ${euiTheme.size.xl};
          block-size: ${euiTheme.size.xl};
          border-radius: inherit;

          &:hover,
          &:active,
          &:focus {
            background: transparent;
            animation: none !important;
            transform: none !important;
          }
        }
      `}
    >
      {children}
    </div>
  );
}

export function ESQLMenu({
  hideHistory,
  onESQLDocsFlyoutVisibilityChanged,
}: {
  hideHistory?: boolean;
  onESQLDocsFlyoutVisibilityChanged?: (isOpen: boolean) => void;
} = {}) {
  const editorActions = useEsqlEditorActions();
  const { euiTheme } = useEuiTheme();
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
    <div
      className={CONTROL_GROUP_CLASS}
      css={css`
        position: relative;
        overflow: hidden;
        border-radius: ${euiTheme.border.radius.small};
        display: inline-flex;
        align-items: stretch;
        flex-direction: row;
        border: ${euiTheme.border.thin};
        background: ${euiTheme.colors.emptyShade};

        &::after {
          content: '';
          position: absolute;
          inset: 0;
          border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
          border-radius: inherit;
          pointer-events: none;
        }

        .${CONTROL_ICON_BUTTON_CLASS} + .${CONTROL_ICON_BUTTON_CLASS} {
          border-inline-start: ${euiTheme.border.width.thin} solid
            ${euiTheme.colors.borderBasePlain};
        }
      `}
    >
      <EsqlMenuIconButton>
        <EuiToolTip position="top" content={visorTooltip} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType={isNlToEsqlEnabled ? MagnifySparklesIcon : 'search'}
            aria-label={searchPlaceholder}
            onClick={onToggleVisor}
            isDisabled={!onToggleVisor}
            data-test-subj="esql-menu-button"
            color="text"
          />
        </EuiToolTip>
      </EsqlMenuIconButton>
      {!hideHistory && (
        <EsqlMenuIconButton>
          <EuiToolTip position="top" content={starredQueryLabel} disableScreenReaderOutput>
            <StardustWrapper active={showStardust}>
              <EuiButtonIcon
                iconType={isStarred ? 'starFill' : 'star'}
                aria-label={starredQueryLabel}
                className={!isStarred ? 'cm-favorite-button--empty' : ''}
                onClick={onToggleStarredQuery}
                isDisabled={!editorActions?.canToggleStarredQuery}
                data-test-subj="ESQLEditor-toggle-starred-query-icon"
                color="text"
              />
            </StardustWrapper>
          </EuiToolTip>
        </EsqlMenuIconButton>
      )}
      {!hideHistory && (
        <EsqlMenuIconButton>
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
              color="text"
            />
          </EuiToolTip>
        </EsqlMenuIconButton>
      )}
      <EsqlMenuIconButton>
        <Suspense
          fallback={
            <EuiToolTip position="top" content={helpLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="question"
                aria-label={helpLabel}
                data-test-subj="esql-help-popover-button"
                color="text"
                isDisabled
              />
            </EuiToolTip>
          }
        >
          <LazyHelpPopover onESQLDocsFlyoutVisibilityChanged={onESQLDocsFlyoutVisibilityChanged} />
        </Suspense>
      </EsqlMenuIconButton>
    </div>
  );
}
