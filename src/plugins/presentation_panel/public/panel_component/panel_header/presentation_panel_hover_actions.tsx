/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import React, {
  MouseEventHandler,
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  EuiButtonIcon,
  EuiButtonIconProps,
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
} from '@elastic/eui';
import { ActionExecutionContext, buildContextMenuForActions } from '@kbn/ui-actions-plugin/public';

import {
  EmbeddableApiContext,
  getViewModeSubject,
  useBatchedOptionalPublishingSubjects,
  ViewMode,
} from '@kbn/presentation-publishing';
import { Subscription } from 'rxjs';
import { euiThemeVars } from '@kbn/ui-theme';
import { css, CSSObject } from '@emotion/react';
import { ActionWithContext } from '@kbn/ui-actions-plugin/public/context_menu/build_eui_context_menu_panels';
import { uiActions } from '../../kibana_services';
import {
  contextMenuTrigger,
  CONTEXT_MENU_TRIGGER,
  panelNotificationTrigger,
  PANEL_NOTIFICATION_TRIGGER,
} from '../../panel_actions';
import { getContextMenuAriaLabel } from '../presentation_panel_strings';
import { DefaultPresentationPanelApi, PresentationPanelInternalProps } from '../types';
import { AnyApiAction } from '../../panel_actions/types';

const QUICK_ACTION_IDS = {
  edit: [
    'editPanel',
    'ACTION_CONFIGURE_IN_LENS',
    'ACTION_CUSTOMIZE_PANEL',
    'ACTION_OPEN_IN_DISCOVER',
    'ACTION_VIEW_SAVED_SEARCH',
  ],
  view: ['ACTION_OPEN_IN_DISCOVER', 'ACTION_VIEW_SAVED_SEARCH', 'openInspector', 'togglePanel'],
};

const allowedNotificationActions = ['ACTION_FILTERS_NOTIFICATION'];

const ALL_ROUNDED_CORNERS = { borderRadius: euiThemeVars.euiBorderRadius };
const TOP_ROUNDED_CORNERS = {
  borderTopLeftRadius: euiThemeVars.euiBorderRadius,
  borderTopRightRadius: euiThemeVars.euiBorderRadius,
  borderBottom: '0 !important',
};

const HOVER_ACTION_STYLES: CSSObject = {
  padding: euiThemeVars.euiSizeXS,
  display: 'flex',
  flexWrap: 'nowrap',
  border: euiThemeVars.euiBorderThin,
  backgroundColor: euiThemeVars.euiColorEmptyShade,
  height: euiThemeVars.euiSizeXL,
  pointerEvents: 'all', // Enable pointer-events for hover actions
};

const createClickHandler =
  (action: AnyApiAction, context: ActionExecutionContext<EmbeddableApiContext>) =>
  (event: React.MouseEvent) => {
    if (event.currentTarget instanceof HTMLAnchorElement) {
      // from react-router's <Link/>
      if (
        !event.defaultPrevented && // onClick prevented default
        event.button === 0 && // ignore everything but left clicks
        (!event.currentTarget.target || event.currentTarget.target === '_self') && // let browser handle "target=_blank" etc.
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) // ignore clicks with modifier keys
      ) {
        event.preventDefault();
        action.execute(context);
      }
    } else action.execute(context);
  };

interface HoverActionElement extends EuiButtonIconProps {
  onClick: MouseEventHandler;
  name: string;
}

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
  const [contextMenuActions, setContextMenuActions] = useState<AnyApiAction[]>([]);
  const [quickActions, setQuickActions] = useState<AnyApiAction[]>([]);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean>(false);
  const [contextMenuPanels, setContextMenuPanels] = useState<EuiContextMenuPanelDescriptor[]>([]);
  const [quickActionElements, setQuickActionElements] = useState<HoverActionElement[]>([]);
  const [notifications, setNotifications] = useState<AnyApiAction[]>([]);
  const hoverActionsRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const leftHoverActionsRef = useRef<HTMLDivElement | null>(null);
  const rightHoverActionsRef = useRef<HTMLDivElement | null>(null);
  const [combineHoverActions, setCombineHoverActions] = useState<boolean>(false);
  const [borderStyles, setBorderStyles] = useState<CSSObject>(TOP_ROUNDED_CORNERS);

  const updateCombineHoverActions = () => {
    if (!hoverActionsRef.current || !anchorRef.current) return;
    const anchorBox = anchorRef.current.getBoundingClientRect();
    const anchorLeft = anchorBox.left;
    const anchorTop = anchorBox.top;
    const anchorWidth = anchorRef.current.offsetWidth;
    const hoverActionsWidth =
      (rightHoverActionsRef.current?.offsetWidth ?? 0) +
      (leftHoverActionsRef.current?.offsetWidth ?? 0) +
      parseInt(euiThemeVars.euiSize, 10) * 2;
    const hoverActionsHeight = rightHoverActionsRef.current?.offsetHeight ?? 0;

    // Left align hover actions when they would get cut off by the right edge of the window
    if (anchorLeft - (hoverActionsWidth - anchorWidth) <= parseInt(euiThemeVars.euiSize, 10)) {
      hoverActionsRef.current.style.removeProperty('right');
      hoverActionsRef.current.style.setProperty('left', '0');
    } else {
      hoverActionsRef.current.style.removeProperty('left');
      hoverActionsRef.current.style.setProperty('right', '0');
    }

    if (anchorRef.current && rightHoverActionsRef.current) {
      const shouldCombine = anchorWidth < hoverActionsWidth;
      const willGetCutOff = anchorTop < hoverActionsHeight;

      if (shouldCombine !== combineHoverActions) {
        setCombineHoverActions(shouldCombine);
      }

      if (willGetCutOff) {
        hoverActionsRef.current.style.setProperty('position', 'absolute');
        hoverActionsRef.current.style.setProperty('top', `-${euiThemeVars.euiSizeS}`);
      } else if (shouldCombine) {
        hoverActionsRef.current.style.setProperty('top', `-${euiThemeVars.euiSizeL}`);
      } else {
        hoverActionsRef.current.style.removeProperty('position');
        hoverActionsRef.current.style.removeProperty('top');
      }

      if (shouldCombine || willGetCutOff) {
        setBorderStyles(ALL_ROUNDED_CORNERS);
      } else {
        setBorderStyles(TOP_ROUNDED_CORNERS);
      }
    }
  };

  const [defaultTitle, title, description, hidePanelTitle, parentHideTitle, parentViewMode] =
    useBatchedOptionalPublishingSubjects(
      api?.defaultPanelTitle,
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
    let canceled = false;
    const apiContext = { embeddable: api };
    const subscriptions = new Subscription();
    const handleActionCompatibilityChange = (
      type: 'quickActions' | 'notifications',
      isCompatible: boolean,
      action: AnyApiAction
    ) => {
      if (canceled) return;
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
                  action as AnyApiAction
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
                  action as AnyApiAction
                )
            )
          );
        }
      }
    })();

    return () => {
      canceled = true;
      subscriptions.unsubscribe();
    };
  }, [api, quickActionIds]);

  useEffect(() => {
    if (!api) return;

    let canceled = false;
    const apiContext = { embeddable: api };

    (async () => {
      let compatibleActions = (await (async () => {
        if (getActions) return await getActions(CONTEXT_MENU_TRIGGER, apiContext);
        return (
          (await uiActions.getTriggerCompatibleActions(CONTEXT_MENU_TRIGGER, {
            embeddable: api,
          })) ?? []
        );
      })()) as AnyApiAction[];
      if (canceled) return;

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
      canceled = true;
    };
  }, [actionPredicate, api, getActions, isContextMenuOpen, parentViewMode, quickActionIds]);

  useEffect(() => {
    if (!api) return;
    setMenuPanelsLoading(true);

    /**
     *
     * Build and update all actions
     */
    const apiContext = { embeddable: api, trigger: contextMenuTrigger };

    (async () => {
      /**
       * Build context menu panel from actions
       */
      const menuPanels = await buildContextMenuForActions({
        actions: contextMenuActions.map((action) => ({
          action,
          context: apiContext,
          trigger: contextMenuTrigger,
        })) as ActionWithContext[],
        closeMenu: () => setIsContextMenuOpen(false),
      });

      const quickActionsElements = quickActions
        .sort(({ order: orderA }, { order: orderB }) => {
          const orderComparison = (orderB || 0) - (orderA || 0);
          return orderComparison;
        })
        .map((action) => {
          const name = action.getDisplayName(apiContext);
          const iconType = action.getIconType(apiContext) as IconType;
          const id = action.id;
          return {
            iconType,
            'data-test-subj': `embeddablePanelAction-${action.id}`,
            onClick: createClickHandler(action, apiContext),
            name,
            id,
          };
        });

      setMenuPanelsLoading(false);
      setContextMenuPanels(menuPanels);
      setQuickActionElements(quickActionsElements);
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
      data-test-subj="embeddablePanelDragHandle"
      css={css(`
        margin: ${euiThemeVars.euiSizeXS}; 
        cursor: move !important;
        img {
          pointer-events: all !important;
        }`)}
    />
  );

  return (
    <div
      onMouseOver={updateCombineHoverActions}
      onFocus={updateCombineHoverActions}
      ref={anchorRef}
      className="embPanel__hoverActionsAnchor"
      data-test-subj={`embeddablePanelHoverActions-${(title || defaultTitle || '').replace(
        /\s/g,
        ''
      )}`}
      css={css({
        position: 'relative',
        height: '100%',
      })}
    >
      {children}
      {api ? (
        <div
          ref={hoverActionsRef}
          css={css({
            height: euiThemeVars.euiSizeXL,
            position: 'absolute',
            display: 'flex',
            justifyContent: 'space-between',
            padding: `0 ${euiThemeVars.euiSize}`,
            flexWrap: 'nowrap',
            minWidth: '100%',
            // Prevent hover actions wrapper from blocking interactions with other panels
            pointerEvents: 'none',
          })}
          className={classNames('embPanel__hoverActionsWrapper', {
            'embPanel__hoverActionsWrapper--openContextMenu': isContextMenuOpen,
          })}
        >
          {viewMode === 'edit' && !combineHoverActions ? (
            <div
              ref={leftHoverActionsRef}
              data-test-subj="embPanel__hoverActions__left"
              className={classNames(
                'embPanel__hoverActions',
                'embPanel__hoverActionsLeft',
                className
              )}
              css={css({ ...borderStyles, ...HOVER_ACTION_STYLES })}
            >
              {dragHandle}
            </div>
          ) : (
            <div /> // necessary for the right hover actions to align correctly when left hover actions are not present
          )}
          <div
            ref={rightHoverActionsRef}
            data-test-subj="embPanel__hoverActions__right"
            className={classNames(
              'embPanel__hoverActions',
              'embPanel__hoverActionsRight',
              className
            )}
            css={css({ ...borderStyles, ...HOVER_ACTION_STYLES })}
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
                    css={css(`padding: $euiSizeXS;`)}
                  />
                )}
                {quickActionElements.map(
                  ({ iconType, 'data-test-subj': dataTestSubj, onClick, name }, i) => (
                    <EuiToolTip key={`main_action_${dataTestSubj}_${api?.uuid}`} content={name}>
                      <EuiButtonIcon
                        iconType={iconType}
                        color="text"
                        onClick={onClick as MouseEventHandler}
                        data-test-subj={dataTestSubj}
                        aria-label={name as string}
                      />
                    </EuiToolTip>
                  )
                )}
                {contextMenuActions.length ? (
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
                    focusTrapProps={{
                      closeOnMouseup: true,
                      clickOutsideDisables: false,
                      onClickOutside: (e) => {
                        setIsContextMenuOpen(false);
                      },
                    }}
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
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
