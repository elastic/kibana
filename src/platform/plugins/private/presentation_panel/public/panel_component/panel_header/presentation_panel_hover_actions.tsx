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
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiIcon,
  EuiIconTip,
  EuiNotificationBadge,
  EuiPopover,
  EuiToolTip,
  IconType,
  useEuiTheme,
} from '@elastic/eui';
import { ActionExecutionContext, buildContextMenuForActions } from '@kbn/ui-actions-plugin/public';

import { css } from '@emotion/react';
import {
  apiCanLockHoverActions,
  EmbeddableApiContext,
  useBatchedOptionalPublishingSubjects,
  ViewMode,
} from '@kbn/presentation-publishing';
import { ActionWithContext } from '@kbn/ui-actions-plugin/public/context_menu/build_eui_context_menu_panels';
import { Subscription } from 'rxjs';
import { uiActions } from '../../kibana_services';
import {
  CONTEXT_MENU_TRIGGER,
  contextMenuTrigger,
  PANEL_NOTIFICATION_TRIGGER,
  panelNotificationTrigger,
} from '../../panel_actions';
import { AnyApiAction } from '../../panel_actions/types';
import { DefaultPresentationPanelApi, PresentationPanelInternalProps } from '../types';
import { useHoverActionStyles } from './use_hover_actions_styles';

const getContextMenuAriaLabel = (title?: string, index?: number) => {
  if (title) {
    return i18n.translate('presentationPanel.contextMenu.ariaLabelWithTitle', {
      defaultMessage: 'Panel options for {title}',
      values: { title },
    });
  }
  if (index) {
    return i18n.translate('presentationPanel.contextMenu.ariaLabelWithIndex', {
      defaultMessage: 'Options for panel {index}',
      values: { index },
    });
  }
  return i18n.translate('presentationPanel.contextMenu.ariaLabel', {
    defaultMessage: 'Panel options',
  });
};

const QUICK_ACTION_IDS = {
  edit: [
    'editPanel',
    'ACTION_CONFIGURE_IN_LENS',
    'ACTION_CUSTOMIZE_PANEL',
    'ACTION_OPEN_IN_DISCOVER',
    'ACTION_VIEW_SAVED_SEARCH',
  ],
  view: ['ACTION_OPEN_IN_DISCOVER', 'ACTION_VIEW_SAVED_SEARCH', 'openInspector', 'togglePanel'],
} as const;

const ALLOWED_NOTIFICATIONS = ['ACTION_FILTERS_NOTIFICATION'] as const;

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
      }
    }
    (event.currentTarget as HTMLElement).blur();
    action.execute(context);
  };

export const PresentationPanelHoverActions = ({
  api,
  index,
  getActions,
  setDragHandle,
  actionPredicate,
  children,
  className,
  viewMode,
  showNotifications = true,
  showBorder,
}: {
  index?: number;
  api: DefaultPresentationPanelApi | null;
  getActions: PresentationPanelInternalProps['getActions'];
  setDragHandle: (id: string, ref: HTMLElement | null) => void;
  actionPredicate?: (actionId: string) => boolean;
  children: ReactElement;
  className?: string;
  viewMode?: ViewMode;
  showNotifications?: boolean;
  showBorder?: boolean;
}) => {
  const [quickActions, setQuickActions] = useState<AnyApiAction[]>([]);
  const [contextMenuPanels, setContextMenuPanels] = useState<EuiContextMenuPanelDescriptor[]>([]);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<AnyApiAction[]>([]);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);

  const { euiTheme } = useEuiTheme();

  const [defaultTitle, title, description, hidePanelTitle, hasLockedHoverActions, parentHideTitle] =
    useBatchedOptionalPublishingSubjects(
      api?.defaultTitle$,
      api?.title$,
      api?.description$,
      api?.hideTitle$,
      api?.hasLockedHoverActions$,
      api?.parentApi?.hideTitle$
    );

  const hideTitle = hidePanelTitle || parentHideTitle;
  const showDescription = description && (!title || hideTitle);

  const quickActionIds = useMemo(
    () => QUICK_ACTION_IDS[viewMode === 'edit' ? 'edit' : 'view'],
    [viewMode]
  );

  const onClose = useCallback(() => {
    setIsContextMenuOpen(false);
    if (apiCanLockHoverActions(api)) {
      api?.lockHoverActions(false);
    }
  }, [api]);

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
      const frequentlyChangingActions = await uiActions.getFrequentlyChangingActionsForTrigger(
        CONTEXT_MENU_TRIGGER,
        apiContext
      );
      if (canceled) return;

      for (const frequentlyChangingAction of frequentlyChangingActions) {
        if ((quickActionIds as readonly string[]).includes(frequentlyChangingAction.id)) {
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
      const frequentlyChangingNotifications =
        await uiActions.getFrequentlyChangingActionsForTrigger(
          PANEL_NOTIFICATION_TRIGGER,
          apiContext
        );
      if (canceled) return;

      for (const frequentlyChangingNotification of frequentlyChangingNotifications) {
        if (
          (ALLOWED_NOTIFICATIONS as readonly string[]).includes(frequentlyChangingNotification.id)
        ) {
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

      const disabledActions = api.disabledActionIds$?.value;
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

      const contextMenuActions = compatibleActions.filter(
        ({ id }) => !(quickActionIds as readonly string[]).includes(id)
      );

      const menuPanels = await buildContextMenuForActions({
        actions: contextMenuActions.map((action) => ({
          action,
          context: apiContext,
          trigger: contextMenuTrigger,
        })) as ActionWithContext[],
        closeMenu: onClose,
      });
      setContextMenuPanels(menuPanels);
      setShowNotification(contextMenuActions.some((action) => action.showNotification));
      setQuickActions(
        compatibleActions.filter(({ id }) => (quickActionIds as readonly string[]).includes(id))
      );
    })();

    return () => {
      canceled = true;
    };
  }, [actionPredicate, api, getActions, isContextMenuOpen, onClose, viewMode, quickActionIds]);

  const quickActionElements = useMemo(() => {
    if (!api || quickActions.length < 1) return [];

    const apiContext = { embeddable: api, trigger: contextMenuTrigger };

    return quickActions
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
  }, [api, quickActions]);

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
          css={{ marginTop: euiTheme.size.xs, marginRight: euiTheme.size.xs }}
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
  }, [api, euiTheme.size.xs, notifications, showNotifications]);

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
      onClick={() => {
        setIsContextMenuOpen(!isContextMenuOpen);
        if (apiCanLockHoverActions(api)) {
          api.lockHoverActions(!hasLockedHoverActions);
        }
      }}
      iconType="boxesVertical"
    />
  );

  const dragHandle = useMemo(
    // memoize the drag handle to avoid calling `setDragHandle` unnecessarily
    () => (
      <button
        className={`embPanel--dragHandle`}
        css={css`
          cursor: move;
          visibility: hidden; // default for every mode **except** edit mode
          width: 0px;

          .embPanel__hoverActionsAnchor--editMode & {
            width: auto;
            visibility: visible; // overwrite visibility in edit mode
          }
        `}
        ref={(ref) => {
          dragHandleRef.current = ref;
          setDragHandle('hoverActions', ref);
        }}
      >
        <EuiIcon
          type="move"
          color="text"
          css={css`
            margin: ${euiTheme.size.xs};
          `}
          data-test-subj="embeddablePanelDragHandle"
          aria-label={i18n.translate('presentationPanel.dragHandle', {
            defaultMessage: 'Move panel',
          })}
        />
      </button>
    ),
    [setDragHandle, euiTheme.size.xs]
  );

  const hasHoverActions = quickActionElements.length || contextMenuPanels.lastIndexOf.length;
  const { containerStyles, hoverActionStyles } = useHoverActionStyles(
    viewMode === 'edit',
    showBorder
  );

  return (
    <div
      className={classNames('embPanel__hoverActionsAnchor', {
        'embPanel__hoverActionsAnchor--lockHoverActions': hasLockedHoverActions,
        'embPanel__hoverActionsAnchor--editMode': viewMode === 'edit',
      })}
      data-test-embeddable-id={api?.uuid}
      data-test-subj={`embeddablePanelHoverActions-${(title || defaultTitle || '').replace(
        /\s/g,
        ''
      )}`}
      css={containerStyles}
    >
      {children}
      {api && hasHoverActions && (
        <div className={classNames('embPanel__hoverActions', className)} css={hoverActionStyles}>
          {dragHandle}
          {/* Wrapping all "right actions" in a span so that flex space-between works as expected */}
          <span>
            {showNotifications && notificationElements}
            {showDescription && (
              <EuiIconTip
                size="m"
                title={!hideTitle ? title || undefined : undefined}
                content={description}
                delay="regular"
                position="top"
                data-test-subj="embeddablePanelDescriptionTooltip"
                type="iInCircle"
                iconProps={{
                  css: css`
                    margin: ${euiTheme.size.xs};
                  `,
                }}
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
            {contextMenuPanels.length ? (
              <EuiPopover
                repositionOnScroll
                panelPaddingSize="none"
                anchorPosition="downRight"
                button={ContextMenuButton}
                isOpen={isContextMenuOpen}
                className={contextMenuClasses}
                closePopover={onClose}
                data-test-subj={
                  isContextMenuOpen
                    ? 'embeddablePanelContextMenuOpen'
                    : 'embeddablePanelContextMenuClosed'
                }
                focusTrapProps={{
                  closeOnMouseup: true,
                  clickOutsideDisables: false,
                  onClickOutside: onClose,
                }}
              >
                <EuiContextMenu
                  data-test-subj="presentationPanelContextMenuItems"
                  initialPanelId={'mainMenu'}
                  panels={contextMenuPanels}
                />
              </EuiPopover>
            ) : null}
          </span>
        </div>
      )}
    </div>
  );
};
