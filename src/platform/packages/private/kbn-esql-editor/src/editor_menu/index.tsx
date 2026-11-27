/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiLoadingSpinner,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiFlyoutProps,
} from '@elastic/eui';
import { StardustWrapper } from '@kbn/content-management-favorites-public';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useEsqlEditorActions } from '../editor_actions_context';
import { useNlToEsqlCheck } from '../hooks/use_nl_to_esql_check';
import { searchPlaceholder } from '../editor_visor/visor_i18n';
import { KeyboardShortcuts } from '../editor_footer/keyboard_shortcuts';
import { QueryWrapComponent } from '../editor_footer/query_wrap_component';
import { MagnifySparklesIcon } from './magnify_sparkles_icon';
import { CreateViewModal, createViewLabel } from '../save_as_view/create_view_modal';
import { ViewCreatedSource } from '../telemetry/telemetry_service';
import { useApplySavedView } from '../save_as_view/use_apply_saved_view';
import { useCanCreateView } from '../save_as_view/use_can_create_view';
import {
  addStarredQueryLabel,
  helpLabel,
  hideHistoryLabel,
  moreActionsLabel,
  removeStarredQueryLabel,
  searchTooltipLabel,
  searchWithNlTooltipLabel,
  showHistoryLabel,
} from './menu_i18n';

const MAX_VISIBLE_ACTIONS_WHEN_COLLAPSED = 3;
const OVERFLOW_PANEL_ID = 0;
const HELP_PANEL_ID = 1;

const LazyHelpMenuContent = React.lazy(async () => {
  const module = await import('./help_popover');
  return { default: module.HelpMenuContent };
});

const LazyHelpDocsFlyout = React.lazy(async () => {
  const module = await import('./help_popover');
  return { default: module.HelpDocsFlyout };
});

const LazyHelpPopover = React.lazy(async () => {
  const module = await import('./help_popover');
  return { default: module.HelpPopover };
});

export function ESQLMenu({
  hideHistory,
  hideVisor,
  hideRecommendedQueries,
  collapseActions = false,
  onESQLDocsFlyoutVisibilityChanged,
  onPrettifyQuery,
  docsFlyoutSize,
  enableCreateView = false,
}: {
  /**
   * Shows only the first few actions inline and moves the rest under an ellipsis
   * ("More actions") button. Used on narrow containers.
   */
  collapseActions?: boolean;
  hideHistory?: boolean;
  /** Shows the action to create an ES|QL view. Hidden unless a host opts in. */
  enableCreateView?: boolean;
  /**
   * Hides the visor (KQL / natural-language search) button. Use when embedding the menu
   * without the full editor, which owns the visor surface the button would toggle.
   */
  hideVisor?: boolean;
  /**
   * Hides the recommended-queries section. Use when no `submitEsqlQuery` action is wired,
   * so picks can't be applied (e.g. the split fragment editors).
   */
  hideRecommendedQueries?: boolean;
  onESQLDocsFlyoutVisibilityChanged?: (isOpen: boolean) => void;
  onPrettifyQuery?: () => void;
  /** Size for the docs flyout. Pass a named size when embedding the menu in another flyout. */
  docsFlyoutSize?: EuiFlyoutProps['size'];
} = {}) {
  const editorActions = useEsqlEditorActions();
  const isNlToEsqlEnabled = useNlToEsqlCheck();
  const visorTooltip = isNlToEsqlEnabled ? searchWithNlTooltipLabel : searchTooltipLabel;
  const isInline = editorActions?.editorIsInline;
  const onToggleVisor = editorActions?.toggleVisor;
  const onToggleHistory = editorActions?.toggleHistory;
  const onToggleStarredQuery = editorActions?.toggleStarredQuery;
  const historyLabel = editorActions?.isHistoryOpen ? hideHistoryLabel : showHistoryLabel;
  const isStarred = Boolean(editorActions?.isCurrentQueryStarred);
  const starredQueryLabel = isStarred ? removeStarredQueryLabel : addStarredQueryLabel;

  const [showStardust, setShowStardust] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  // One docs flyout shared by the inline Help button and the overflow menu, owned here so it
  // survives the footer switching between the two layouts. Mounted on first open to keep the
  // help code lazy.
  const [isDocsFlyoutOpen, setIsDocsFlyoutOpen] = useState(false);
  const [hasOpenedDocsFlyout, setHasOpenedDocsFlyout] = useState(false);
  const onDocsFlyoutOpenChange = useCallback((isOpen: boolean) => {
    setIsDocsFlyoutOpen(isOpen);
    if (isOpen) {
      setHasOpenedDocsFlyout(true);
    }
  }, []);
  const [queryToSave, setQueryToSave] = useState<string>();
  const [hasSeenCreateView, setHasSeenCreateView] = useLocalStorage<boolean>(
    'esqlEditor.hasSeenCreateView',
    false
  );
  const applySavedView = useApplySavedView();
  const canCreateView = useCanCreateView(enableCreateView);
  const currentQuery = editorActions?.currentQuery ?? '';
  const wasStarredRef = useRef(isStarred);
  if (isStarred && !wasStarredRef.current) {
    setShowStardust(true);
  } else if (!isStarred && wasStarredRef.current) {
    setShowStardust(false);
  }
  wasStarredRef.current = isStarred;

  const createViewAction = canCreateView && (
    <EuiFlexItem grow={false} key="createView">
      <span css={{ position: 'relative', display: 'inline-flex' }}>
        <EuiToolTip position="top" content={createViewLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="tablePlus"
            size="xs"
            aria-label={createViewLabel}
            onClick={() => {
              setHasSeenCreateView(true);
              setQueryToSave(currentQuery);
            }}
            isDisabled={currentQuery.trim().length === 0}
            data-test-subj="ESQLEditor-create-view-icon"
            color="text"
          />
        </EuiToolTip>
        {!hasSeenCreateView && (
          <EuiIcon
            type="dot"
            color="primary"
            data-test-subj="ESQLEditor-create-view-dot"
            aria-hidden={true}
            css={{
              position: 'absolute',
              insetBlockStart: '-1px',
              insetInlineEnd: '-1px',
              pointerEvents: 'none',
            }}
          />
        )}
      </span>
    </EuiFlexItem>
  );
  const starredAction = !hideHistory && (
    <EuiFlexItem grow={false} key="starred">
      <EuiToolTip position="top" content={starredQueryLabel} disableScreenReaderOutput>
        <StardustWrapper active={showStardust}>
          <EuiButtonIcon
            iconType={isStarred ? 'starFill' : 'star'}
            size="xs"
            aria-label={starredQueryLabel}
            className={!isStarred ? 'cm-favorite-button--empty' : ''}
            onClick={onToggleStarredQuery}
            isDisabled={!editorActions?.canToggleStarredQuery}
            data-test-subj="ESQLEditor-toggle-starred-query-icon"
            color="text"
          />
        </StardustWrapper>
      </EuiToolTip>
    </EuiFlexItem>
  );
  const historyAction = !hideHistory && (
    <EuiFlexItem grow={false} key="history">
      <EuiToolTip position="top" content={historyLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="clockCounter"
          size="xs"
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
    </EuiFlexItem>
  );
  const helpAction = (
    <EuiFlexItem grow={false} key="help">
      <Suspense
        fallback={
          <EuiToolTip position="top" content={helpLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="question"
              size="xs"
              aria-label={helpLabel}
              data-test-subj="esql-help-popover-button"
              color="text"
              isDisabled
            />
          </EuiToolTip>
        }
      >
        <LazyHelpPopover
          onESQLDocsFlyoutVisibilityChanged={onESQLDocsFlyoutVisibilityChanged}
          docsFlyoutSize={docsFlyoutSize}
          hideRecommendedQueries={hideRecommendedQueries}
          isDocsFlyoutOpen={isDocsFlyoutOpen}
          onDocsFlyoutOpenChange={onDocsFlyoutOpenChange}
        />
      </Suspense>
    </EuiFlexItem>
  );
  const visorAction = isInline && !hideVisor && (
    <EuiFlexItem grow={false} key="visor">
      <EuiToolTip position="top" content={visorTooltip} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType={isNlToEsqlEnabled ? MagnifySparklesIcon : 'search'}
          size="xs"
          aria-label={searchPlaceholder}
          onClick={onToggleVisor}
          isDisabled={!onToggleVisor}
          data-test-subj="esql-menu-button"
          color="text"
        />
      </EuiToolTip>
    </EuiFlexItem>
  );

  // Recommended queries has its own back header, so the outer "help" one is hidden meanwhile
  const [isRecommendedQueriesOpen, setIsRecommendedQueriesOpen] = useState(false);
  useEffect(() => {
    if (!isOverflowOpen) {
      setIsRecommendedQueriesOpen(false);
    }
  }, [isOverflowOpen]);
  const closeOverflow = useCallback(() => setIsOverflowOpen(false), []);
  const openDocs = useCallback(() => {
    if (editorActions?.editorIsInline) {
      editorActions.toggleLanguageComponent();
    } else {
      onDocsFlyoutOpenChange(!isDocsFlyoutOpen);
    }
    setIsOverflowOpen(false);
  }, [editorActions, isDocsFlyoutOpen, onDocsFlyoutOpenChange]);

  // `menuItem` is how the action is shown under the ellipsis button. Only the actions that can
  // land there (everything after the first three) need one.
  const actions: Array<{ inline: React.ReactNode; menuItem?: EuiContextMenuPanelItemDescriptor }> =
    [
      onPrettifyQuery && {
        inline: <QueryWrapComponent key="prettify" onPrettifyQuery={onPrettifyQuery} />,
      },
      { inline: <KeyboardShortcuts key="keyboardShortcuts" /> },
      createViewAction && { inline: createViewAction },
      starredAction && {
        inline: starredAction,
        menuItem: {
          name: starredQueryLabel,
          icon: isStarred ? 'starFill' : 'star',
          disabled: !editorActions?.canToggleStarredQuery,
          'data-test-subj': 'ESQLEditor-toggle-starred-query-icon',
          onClick: () => {
            onToggleStarredQuery?.();
            closeOverflow();
          },
        },
      },
      historyAction && {
        inline: historyAction,
        menuItem: {
          name: historyLabel,
          icon: 'clockCounter',
          disabled: !onToggleHistory,
          'data-test-subj': 'ESQLEditor-toggle-query-history-icon',
          onClick: () => {
            onToggleHistory?.();
            closeOverflow();
          },
        },
      },
      {
        inline: helpAction,
        menuItem: {
          name: helpLabel,
          icon: 'question',
          panel: HELP_PANEL_ID,
          'data-test-subj': 'esql-help-popover-button',
        },
      },
      visorAction && {
        inline: visorAction,
        menuItem: {
          name: searchPlaceholder,
          // context menu items take an icon name or an element, not a bare icon component
          icon: isNlToEsqlEnabled ? <EuiIcon type={MagnifySparklesIcon} aria-hidden /> : 'search',
          disabled: !onToggleVisor,
          'data-test-subj': 'esql-menu-button',
          onClick: () => {
            onToggleVisor?.();
            closeOverflow();
          },
        },
      },
    ].filter(Boolean) as Array<{
      inline: React.ReactNode;
      menuItem?: EuiContextMenuPanelItemDescriptor;
    }>;
  const visibleActions = collapseActions
    ? actions.slice(0, MAX_VISIBLE_ACTIONS_WHEN_COLLAPSED)
    : actions;
  const overflowActions = collapseActions ? actions.slice(MAX_VISIBLE_ACTIONS_WHEN_COLLAPSED) : [];

  const overflowPanels: EuiContextMenuPanelDescriptor[] = [
    {
      id: OVERFLOW_PANEL_ID,
      items: overflowActions.flatMap(({ menuItem }) => (menuItem ? [menuItem] : [])),
    },
    {
      id: HELP_PANEL_ID,
      title: isRecommendedQueriesOpen ? undefined : helpLabel,
      content: (
        <Suspense fallback={<EuiLoadingSpinner size="m" css={{ margin: '8px' }} />}>
          <LazyHelpMenuContent
            hideRecommendedQueries={hideRecommendedQueries}
            onOpenDocs={openDocs}
            closeMenu={closeOverflow}
            onPanelChange={(panelId) => setIsRecommendedQueriesOpen(panelId !== 0)}
          />
        </Suspense>
      ),
    },
  ];

  return (
    <>
      {visibleActions.map(({ inline }) => inline)}
      {overflowActions.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={moreActionsLabel}
            isOpen={isOverflowOpen}
            closePopover={closeOverflow}
            anchorPosition="downCenter"
            panelPaddingSize="none"
            button={
              <EuiToolTip position="top" content={moreActionsLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="ellipsis"
                  size="xs"
                  color="text"
                  aria-label={moreActionsLabel}
                  data-test-subj="ESQLEditor-more-actions"
                  onClick={() => setIsOverflowOpen((isOpen) => !isOpen)}
                />
              </EuiToolTip>
            }
          >
            <EuiContextMenu
              initialPanelId={OVERFLOW_PANEL_ID}
              panels={overflowPanels}
              data-test-subj="ESQLEditor-more-actions-panel"
            />
          </EuiPopover>
        </EuiFlexItem>
      )}
      {!editorActions?.editorIsInline && hasOpenedDocsFlyout && (
        <Suspense fallback={null}>
          <LazyHelpDocsFlyout
            isOpen={isDocsFlyoutOpen}
            onOpenChange={onDocsFlyoutOpenChange}
            onESQLDocsFlyoutVisibilityChanged={onESQLDocsFlyoutVisibilityChanged}
            docsFlyoutSize={docsFlyoutSize}
          />
        </Suspense>
      )}
      {queryToSave !== undefined && (
        <CreateViewModal
          query={queryToSave}
          onClose={() => setQueryToSave(undefined)}
          onSaved={applySavedView}
          source={ViewCreatedSource.EDITOR_MENU}
        />
      )}
    </>
  );
}
