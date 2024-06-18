/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import React, {
  MouseEventHandler,
  ReactElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiContextMenuPanelDescriptor,
  EuiIcon,
  EuiIconTip,
  EuiNotificationBadge,
  EuiPopover,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiToolTip,
  IconType,
  useResizeObserver,
} from '@elastic/eui';
import { Action, buildContextMenuForActions } from '@kbn/ui-actions-plugin/public';

import {
  getViewModeSubject,
  useBatchedOptionalPublishingSubjects,
  ViewMode,
} from '@kbn/presentation-publishing';
import { Subscription } from 'rxjs';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { debounce } from 'lodash';
import { uiActions } from '../../kibana_services';
import {
  contextMenuTrigger,
  CONTEXT_MENU_TRIGGER,
  panelNotificationTrigger,
  PANEL_NOTIFICATION_TRIGGER,
} from '../../panel_actions';
import { getContextMenuAriaLabel } from '../presentation_panel_strings';
import { DefaultPresentationPanelApi, PresentationPanelInternalProps } from '../types';

const QUICK_ACTION_IDS = {
  edit: [
    'editPanel',
    'ACTION_CONFIGURE_IN_LENS',
    'ACTION_CUSTOMIZE_PANEL',
    'editAnomalyChartsPanelAction',
    'ACTION_OPEN_IN_DISCOVER',
  ],
  view: ['ACTION_OPEN_IN_DISCOVER', 'openInspector', 'togglePanel'],
};

const allowedNotificationActions = ['ACTION_FILTERS_NOTIFICATION'];

const LEFT_ALIGNED_POSITION = `left: ${euiThemeVars.euiSize};`;
const RIGHT_ALIGNED_POSITION = `right: ${euiThemeVars.euiSize};`;
const OVER_PANEL_BORDER_RADIUS = `border-radius: ${euiThemeVars.euiBorderRadius};`;
const UNDER_PANEL_BORDER_RADIUS = `border-top-left-radius: ${euiThemeVars.euiBorderRadius};
 border-top-right-radius: ${euiThemeVars.euiBorderRadius};`;

export const PresentationPanelHoverActions = ({
  api,
  index,
  getActions,
  actionPredicate,
  children,
  className,
  viewMode,
  showNotifications = true,
}: {
  index?: number;
  api: DefaultPresentationPanelApi | null;
  getActions: PresentationPanelInternalProps['getActions'];
  actionPredicate?: (actionId: string) => boolean;
  children: ReactElement;
  className?: string;
  viewMode?: ViewMode;
  showNotifications?: boolean;
}) => {
  const [menuPanelsLoading, setMenuPanelsLoading] = useState(false);
  const [contextMenuActions, setContextMenuActions] = useState<Array<Action<object>>>([]);
  const [quickActions, setQuickActions] = useState<Array<Action<object>>>([]);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean>(false);
  const [contextMenuPanels, setContextMenuPanels] = useState<EuiContextMenuPanelDescriptor[]>([]);
  const [hoverActionPanels, setHoverActionPanels] = useState<EuiContextMenuPanelDescriptor[]>([]);
  const [notifications, setNotifications] = useState<Array<Action<object>>>([]);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const leftHoverActionsRef = useRef<HTMLDivElement | null>(null);
  const rightHoverActionsRef = useRef<HTMLDivElement | null>(null);
  const [combineHoverActions, setCombineHoverActions] = useState<boolean>(false);
  const [rightHoverActionsStyles, setRightHoverActionsStyles] =
    useState<string>(`${RIGHT_ALIGNED_POSITION}
      ${UNDER_PANEL_BORDER_RADIUS}`);

  const { width: anchorWidth } = useResizeObserver(anchorRef.current, 'width');
  const { width: leftActionsWidth } = useResizeObserver(leftHoverActionsRef.current, 'width');
  const { width: rightActionsWidth } = useResizeObserver(rightHoverActionsRef.current, 'width');

  const updateCombineHoverActions = debounce(() => {
    if (!anchorRef.current || !rightHoverActionsRef.current) return;

    // Combine drag handle and hover actions if the panel is too narrow
    const shouldCombineActions =
      anchorWidth < leftActionsWidth + rightActionsWidth + parseInt(euiThemeVars.euiSize, 10) * 3;

    if (shouldCombineActions !== combineHoverActions) {
      setCombineHoverActions(shouldCombineActions);
    }

    const { left: anchorLeft } = anchorRef.current.getBoundingClientRect();

    // Adjust alignment if the hover actions will be cut off by the left edge of the screen
    const alignment =
      rightActionsWidth - anchorWidth + parseInt(euiThemeVars.euiSize, 10) * 2 > anchorLeft
        ? LEFT_ALIGNED_POSITION
        : RIGHT_ALIGNED_POSITION;

    // Adjust border radius if the panel is too narrow
    const rightActionsStyles = `${alignment}
    ${shouldCombineActions ? OVER_PANEL_BORDER_RADIUS : UNDER_PANEL_BORDER_RADIUS}`;

    if (rightActionsStyles !== rightHoverActionsStyles) {
      setRightHoverActionsStyles(rightActionsStyles);
    }
  }, 100);

  useLayoutEffect(updateCombineHoverActions, [
    anchorWidth,
    combineHoverActions,
    leftActionsWidth,
    rightActionsWidth,
    updateCombineHoverActions,
  ]);

  const [title, description, hidePanelTitle, parentHideTitle, parentViewMode] =
    useBatchedOptionalPublishingSubjects(
      api?.panelTitle,
      api?.panelDescription,
      api?.hidePanelTitle,
      api?.parentApi?.hidePanelTitle,

      /**
       * View mode changes often have the biggest influence over which actions will be compatible,
       * so we build and update all actions when the view mode changes. This is temporary, as these
       * actions should eventually all be Frequent Compatibility Change Actions which can track their
       * own dependencies.
       */
      getViewModeSubject(api ?? undefined)
    );

  const hideTitle = hidePanelTitle || parentHideTitle;

  const showDescription = description && (!title || hideTitle);

  const quickActionIds = useMemo(
    () => QUICK_ACTION_IDS[parentViewMode === 'edit' ? 'edit' : 'view'],
    [parentViewMode]
  );

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const apiContext = { embeddable: api };
    const subscriptions = new Subscription();
    const handleActionCompatibilityChange = (
      type: 'quickActions' | 'notifications',
      isCompatible: boolean,
      action: Action<object>
    ) => {
      if (cancelled) return;
      (type === 'quickActions' ? setQuickActions : setNotifications)((currentActions) => {
        const newActions = currentActions?.filter((current) => current.id !== action.id);
        if (isCompatible) return [...newActions, action];
        return newActions;
      });
    };

    (async () => {
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
                handleActionCompatibilityChange(
                  'quickActions',
                  isCompatible,
                  action as Action<object>
                )
            )
          );
        }
      }

      // subscribe to any frequently changing notification actions
      const frequentlyChangingNotifications = uiActions.getFrequentlyChangingActionsForTrigger(
        PANEL_NOTIFICATION_TRIGGER,
        apiContext
      );

      for (const frequentlyChangingNotification of frequentlyChangingNotifications) {
        if (allowedNotificationActions.includes(frequentlyChangingNotification.id)) {
          subscriptions.add(
            frequentlyChangingNotification.subscribeToCompatibilityChanges(
              apiContext,
              (isCompatible, action) =>
                handleActionCompatibilityChange(
                  'notifications',
                  isCompatible,
                  action as Action<object>
                )
            )
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      subscriptions.unsubscribe();
    };
  }, [api, quickActionIds]);

  useEffect(() => {
    if (!api) return;

    let cancelled = false;
    const apiContext = { embeddable: api };

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
    })();

    return () => {
      cancelled = true;
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

  const notificationElements = useMemo(() => {
    if (!showNotifications || !api) return [];
    return notifications?.map((notification) => {
      let notificationComponent = notification.MenuItem ? (
        React.createElement(notification.MenuItem, {
          key: notification.id,
          context: {
            embeddable: api,
            trigger: panelNotificationTrigger,
          },
        })
      ) : (
        <EuiNotificationBadge
          data-test-subj={`embeddablePanelNotification-${notification.id}`}
          key={notification.id}
          style={{ marginTop: euiThemeVars.euiSizeXS, marginRight: euiThemeVars.euiSizeXS }}
          onClick={() =>
            notification.execute({ embeddable: api, trigger: panelNotificationTrigger })
          }
        >
          {notification.getDisplayName({ embeddable: api, trigger: panelNotificationTrigger })}
        </EuiNotificationBadge>
      );

      if (notification.getDisplayNameTooltip) {
        const tooltip = notification.getDisplayNameTooltip({
          embeddable: api,
          trigger: panelNotificationTrigger,
        });

        if (tooltip) {
          notificationComponent = (
            <EuiToolTip position="top" delay="regular" content={tooltip} key={notification.id}>
              {notificationComponent}
            </EuiToolTip>
          );
        }
      }

      return notificationComponent;
    });
  }, [api, notifications, showNotifications]);

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
      iconType="boxesVertical"
    />
  );

  const dragHandle = (
    <EuiIcon
      type="move"
      color="text"
      className={`${viewMode === 'edit' ? 'embPanel--dragHandle' : ''}`}
      aria-label={i18n.translate('presentationPanel.dragHandle', {
        defaultMessage: 'Move panel',
      })}
      css={css`
        margin: ${euiThemeVars.euiSizeXS};
      `}
    />
  );

  return (
    <div ref={anchorRef} className="embPanel__floatingActionsAnchor">
      {children}
      {api && (
        <div className="embPanel__floatingActionsWrapper">
          {viewMode === 'edit' && !combineHoverActions && (
            <div
              ref={leftHoverActionsRef}
              data-test-subj={`embPanel__floatingActions__left`}
              className={classNames(
                'embPanel__floatingActions',
                'embPanel__floatingActionsLeft',
                className,
                {
                  'embPanel__floatingActions--openContextMenu': isContextMenuOpen,
                }
              )}
              css={css`
                ${LEFT_ALIGNED_POSITION}
                ${UNDER_PANEL_BORDER_RADIUS}
              `}
            >
              {dragHandle}
            </div>
          )}
          <div
            ref={rightHoverActionsRef}
            data-test-subj={`embPanel__floatingActions__right`}
            className={classNames(
              'embPanel__floatingActions',
              'embPanel__floatingActionsRight',
              className,
              {
                'embPanel__floatingActions--openContextMenu': isContextMenuOpen,
              }
            )}
            css={css`
              ${rightHoverActionsStyles}
            `}
          >
            {menuPanelsLoading ? (
              <>
                <EuiSkeletonRectangle width="16px" height="16px" />
                <EuiSkeletonRectangle width="16px" height="16px" />
                <EuiSkeletonRectangle width="16px" height="16px" />
              </>
            ) : (
              <>
                {viewMode === 'edit' && combineHoverActions && dragHandle}
                {showNotifications && notificationElements}
                {showDescription && (
                  <EuiIconTip
                    title={!hideTitle ? title || undefined : undefined}
                    content={description}
                    delay="regular"
                    position="top"
                    anchorClassName="embPanel__descriptionTooltipAnchor"
                    data-test-subj="embeddablePanelDescriptionTooltip"
                    type="iInCircle"
                  />
                )}
                {hoverActionPanels[0]?.items
                  ?.filter(({ isSeparator }) => !isSeparator)
                  .map(({ icon, 'data-test-subj': dataTestSubj, onClick, name }, i) => (
                    <EuiToolTip key={`main_action_${dataTestSubj}_${api?.uuid}`} content={name}>
                      <EuiButtonIcon
                        iconType={icon as IconType}
                        color="text"
                        onClick={onClick as MouseEventHandler}
                        data-test-subj={dataTestSubj}
                        aria-label={name as string}
                      />
                    </EuiToolTip>
                  ))}
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
        </div>
      )}
    </div>
  );
};
