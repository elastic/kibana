/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import React, { MouseEventHandler, ReactElement, useEffect, useMemo, useState } from 'react';

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiContextMenuPanelDescriptor,
  EuiIcon,
  EuiPopover,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiToolTip,
  IconType,
} from '@elastic/eui';
import { Action, buildContextMenuForActions } from '@kbn/ui-actions-plugin/public';

import {
  getViewModeSubject,
  useBatchedOptionalPublishingSubjects,
  ViewMode,
} from '@kbn/presentation-publishing';
import { Subscription } from 'rxjs';
import { uiActions } from '../../kibana_services';
import { contextMenuTrigger, CONTEXT_MENU_TRIGGER } from '../../panel_actions';
import { getContextMenuAriaLabel } from '../presentation_panel_strings';
import { DefaultPresentationPanelApi, PresentationPanelInternalProps } from '../types';

const QUICK_ACTION_IDS = {
  edit: ['editPanel', 'ACTION_CONFIGURE_IN_LENS', 'ACTION_CUSTOMIZE_PANEL'],
  view: ['ACTION_OPEN_IN_DISCOVER', 'openInspector'],
};

export const PresentationPanelContextMenu = ({
  api,
  index,
  getActions,
  actionPredicate,
  children,
  className,
  viewMode,
}: {
  index?: number;
  api: DefaultPresentationPanelApi | null;
  getActions: PresentationPanelInternalProps['getActions'];
  actionPredicate?: (actionId: string) => boolean;
  children: ReactElement;
  className?: string;
  viewMode?: ViewMode;
}) => {
  const [menuPanelsLoading, setMenuPanelsLoading] = useState(false);
  const [contextMenuActions, setContextMenuActions] = useState<Array<Action<object>>>([]);
  const [quickActions, setQuickActions] = useState<Array<Action<object>>>([]);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean>(false);
  const [contextMenuPanels, setContextMenuPanels] = useState<EuiContextMenuPanelDescriptor[]>([]);
  const [hoverActionPanels, setHoverActionPanels] = useState<EuiContextMenuPanelDescriptor[]>([]);

  const [title, description, hideTitle, parentViewMode] = useBatchedOptionalPublishingSubjects(
    api?.panelTitle,
    api?.panelDescription,
    api?.hidePanelTitle,

    /**
     * View mode changes often have the biggest influence over which actions will be compatible,
     * so we build and update all actions when the view mode changes. This is temporary, as these
     * actions should eventually all be Frequent Compatibility Change Actions which can track their
     * own dependencies.
     */
    getViewModeSubject(api ?? undefined)
  );

  const showDescription = description && (!title || hideTitle);

  const quickActionIds = QUICK_ACTION_IDS[parentViewMode === 'edit' ? 'edit' : 'view'];

  useEffect(() => {
    if (!api) return;

    let cancelled = false;
    const subscriptions = new Subscription();
    const apiContext = { embeddable: api };

    const handleActionCompatibilityChange = (isCompatible: boolean, action: Action<object>) => {
      if (cancelled) return;
      setQuickActions((currentActions) => {
        const newActions = currentActions?.filter((current) => current.id !== action.id);
        if (isCompatible) return [...newActions, action];
        return newActions;
      });
    };

    (async () => {
      let compatibleActions: Array<Action<object>> = await (async () => {
        if (getActions) return await getActions(CONTEXT_MENU_TRIGGER, apiContext);
        return (
          (await uiActions.getTriggerCompatibleActions(CONTEXT_MENU_TRIGGER, {
            embeddable: api,
          })) ?? []
        );
      })();
      if (cancelled) return;

      const disabledActions = api.disabledActionIds?.value;
      if (disabledActions) {
        compatibleActions = compatibleActions.filter(
          (action) => disabledActions.indexOf(action.id) === -1
        );
      }

      if (actionPredicate) {
        compatibleActions = compatibleActions.filter(({ id }) => actionPredicate(id));
      }

      compatibleActions.sort(
        ({ order: orderA }, { order: orderB }) => (orderB || 0) - (orderA || 0)
      );

      setContextMenuActions(compatibleActions.filter(({ id }) => !quickActionIds.includes(id)));
      setQuickActions(compatibleActions.filter(({ id }) => quickActionIds.includes(id)));

      // subscribe to any frequently changing context menu actions
      const frequentlyChangingActions = uiActions.getFrequentlyChangingActionsForTrigger(
        CONTEXT_MENU_TRIGGER,
        apiContext
      );

      for (const frequentlyChangingAction of frequentlyChangingActions) {
        if (quickActionIds.includes(frequentlyChangingAction.id)) {
          subscriptions.add(
            frequentlyChangingAction.subscribeToCompatibilityChanges(
              apiContext,
              (isCompatible, action) =>
                handleActionCompatibilityChange(isCompatible, action as Action<object>)
            )
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      subscriptions.unsubscribe();
    };
  }, [actionPredicate, api, getActions, isContextMenuOpen, parentViewMode, quickActionIds]);

  useEffect(() => {
    if (!api) return;
    setMenuPanelsLoading(true);

    /**
     *
     * Build and update all actions
     */
    const apiContext = { embeddable: api };

    (async () => {
      /**
       * Build context menu panel from actions
       */
      const menuPanels = await buildContextMenuForActions({
        actions: contextMenuActions.map((action) => ({
          action,
          context: apiContext,
          trigger: contextMenuTrigger,
        })),
        closeMenu: () => setIsContextMenuOpen(false),
      });

      const quickActionsPanels = await buildContextMenuForActions({
        actions: quickActions.map((action) => ({
          action,
          context: apiContext,
          trigger: contextMenuTrigger,
        })),
        closeMenu: () => setIsContextMenuOpen(false),
      });

      setMenuPanelsLoading(false);
      setContextMenuPanels(menuPanels);
      setHoverActionPanels(quickActionsPanels);
    })();
  }, [api, contextMenuActions, quickActions]);

  const showNotification = useMemo(
    () => contextMenuActions.some((action) => action.showNotification),
    [contextMenuActions]
  );

  const contextMenuClasses = classNames({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    embPanel__optionsMenuPopover: true,
    'embPanel__optionsMenuPopover-notification': showNotification,
  });

  const ContextMenuButton = (
    <EuiButtonIcon
      color="text"
      data-test-subj="embeddablePanelToggleMenuIcon"
      aria-label={getContextMenuAriaLabel(title, index)}
      onClick={() => setIsContextMenuOpen((isOpen) => !isOpen)}
      iconType={'boxesVertical'}
    />
  );

  return (
    <div className="embPanel__floatingActionsWrapper">
      {children}
      {api && (
        <>
          {viewMode === 'edit' && (
            <>
              <div
                data-test-subj={`embPanel__floatingActions__left`}
                className={classNames(
                  'embPanel__floatingActions',
                  'embPanel__floatingActionsLeft',
                  className,
                  {
                    'embPanel__floatingActions--openContextMenu': isContextMenuOpen,
                  }
                )}
              >
                <EuiIcon
                  type="grabOmnidirectional"
                  color="text"
                  className={`${viewMode === 'edit' ? 'embPanel--dragHandle' : ''}`}
                  aria-label={i18n.translate('presentationPanel.dragHandle', {
                    defaultMessage: 'Move panel',
                  })}
                />
              </div>
            </>
          )}
          <div
            data-test-subj={`embPanel__floatingActions__right`}
            className={classNames(
              'embPanel__floatingActions',
              'embPanel__floatingActionsRight',
              className,
              {
                'embPanel__floatingActions--openContextMenu': isContextMenuOpen,
              }
            )}
          >
            {menuPanelsLoading ? (
              <>
                <EuiSkeletonRectangle width="16px" height="16px" />
                <EuiSkeletonRectangle width="16px" height="16px" />
                <EuiSkeletonRectangle width="16px" height="16px" />
              </>
            ) : (
              <>
                {showDescription && (
                  <EuiToolTip
                    title={!hideTitle ? title || undefined : undefined}
                    content={description}
                    delay="regular"
                    position="top"
                    anchorClassName="embPanel__titleTooltipAnchor"
                    anchorProps={{ 'data-test-subj': 'embeddablePanelTooltipAnchor' }}
                  >
                    <span
                      data-test-subj="embeddablePanelTitleInner"
                      className="embPanel__titleInner"
                    >
                      <EuiIcon
                        type="iInCircle"
                        color="subdued"
                        data-test-subj="embeddablePanelTitleDescriptionIcon"
                      />
                    </span>
                  </EuiToolTip>
                )}
                {hoverActionPanels[0]?.items?.map(
                  ({ icon, 'data-test-subj': dataTestSubj, onClick, name }, i) => (
                    <EuiToolTip key={`main_action_${dataTestSubj}_${api?.uuid}`} content={name}>
                      <EuiButtonIcon
                        iconType={icon as IconType}
                        color="text"
                        onClick={onClick as MouseEventHandler}
                        data-test-subj={dataTestSubj}
                        aria-label={name as string}
                      />
                    </EuiToolTip>
                  )
                )}
                {contextMenuPanels.length && (
                  <EuiPopover
                    repositionOnScroll
                    panelPaddingSize="none"
                    anchorPosition="downRight"
                    button={ContextMenuButton}
                    isOpen={isContextMenuOpen}
                    className={contextMenuClasses}
                    closePopover={() => setIsContextMenuOpen(false)}
                    data-test-subj={
                      isContextMenuOpen
                        ? 'embeddablePanelContextMenuOpen'
                        : 'embeddablePanelContextMenuClosed'
                    }
                  >
                    {menuPanelsLoading ? (
                      <EuiContextMenuPanel
                        className="embPanel__optionsMenuPopover-loading"
                        title={i18n.translate('presentationPanel.contextMenu.loadingTitle', {
                          defaultMessage: 'Options',
                        })}
                      >
                        <EuiContextMenuItem>
                          <EuiSkeletonText />
                        </EuiContextMenuItem>
                      </EuiContextMenuPanel>
                    ) : (
                      <EuiContextMenu
                        data-test-subj="presentationPanelContextMenuItems"
                        initialPanelId={'mainMenu'}
                        panels={contextMenuPanels}
                      />
                    )}
                  </EuiPopover>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
