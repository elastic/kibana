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
  EuiPanel,
  EuiPopover,
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
import { uiActions } from '../../kibana_services';
import { contextMenuTrigger, CONTEXT_MENU_TRIGGER } from '../../panel_actions';
import { getContextMenuAriaLabel } from '../presentation_panel_strings';
import { DefaultPresentationPanelApi, PresentationPanelInternalProps } from '../types';
// import moveSVG from './move.svg';

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
  const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean | undefined>(undefined);
  const [contextMenuPanels, setContextMenuPanels] = useState<EuiContextMenuPanelDescriptor[]>([]);

  const [title, parentViewMode] = useBatchedOptionalPublishingSubjects(
    api?.panelTitle,

    /**
     * View mode changes often have the biggest influence over which actions will be compatible,
     * so we build and update all actions when the view mode changes. This is temporary, as these
     * actions should eventually all be Frequent Compatibility Change Actions which can track their
     * own dependencies.
     */
    getViewModeSubject(api ?? undefined)
  );

  useEffect(() => {
    /**
     * isContextMenuOpen starts as undefined which allows this use effect to run on mount. This
     * is required so that showNotification is calculated on mount.
     */
    if (isContextMenuOpen === false || !api) return;

    setMenuPanelsLoading(true);
    let canceled = false;
    (async () => {
      /**
       * Build and update all actions
       */
      let compatibleActions: Array<Action<object>> = await (async () => {
        if (getActions) return await getActions(CONTEXT_MENU_TRIGGER, { embeddable: api });
        return (
          (await uiActions.getTriggerCompatibleActions(CONTEXT_MENU_TRIGGER, {
            embeddable: api,
          })) ?? []
        );
      })();
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

      /**
       * Build context menu panel from actions
       */
      const panels = await buildContextMenuForActions({
        actions: compatibleActions.map((action) => ({
          action,
          context: { embeddable: api },
          trigger: contextMenuTrigger,
        })),
        closeMenu: () => setIsContextMenuOpen(false),
      });
      if (canceled) return;

      setMenuPanelsLoading(false);
      setContextMenuActions(compatibleActions);
      setContextMenuPanels(panels);
    })();
    return () => {
      canceled = true;
    };
  }, [actionPredicate, api, getActions, isContextMenuOpen, parentViewMode]);

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

  const [mainMenu, moreMenu] = contextMenuPanels;

  console.log({ mainMenu, moreMenu });

  return (
    <div className="embPanel__floatingActionsWrapper">
      {children}
      {api && (
        <>
          {viewMode === 'edit' && (
            <div
              data-test-subj={`embPanel__floatingActions__${api?.uuid}__left`}
              className={classNames(
                'embPanel__floatingActions embPanel__floatingActionsLeft',
                className
              )}
            >
              <EuiIcon
                // type={moveSVG}
                type="grabOmnidirectional"
                className={`${viewMode === 'edit' ? 'embPanel--dragHandle' : ''}`}
                aria-label={i18n.translate('presentationPanel.dragHandle', {
                  defaultMessage: 'Move panel',
                })}
              />
            </div>
          )}
          <div
            data-test-subj={`embPanel__floatingActions__${api?.uuid}__right`}
            className={classNames(
              'embPanel__floatingActions embPanel__floatingActionsRight',
              className
            )}
          >
            {mainMenu?.items &&
              mainMenu?.items?.map(({ icon, 'data-test-subj': dataTestSubj, onClick, name }) => (
                <EuiToolTip key={`hoveraction_${dataTestSubj}_${api?.uuid}`} content={name}>
                  <EuiButtonIcon
                    iconType={icon as IconType}
                    color="text"
                    onClick={onClick as MouseEventHandler}
                    data-test-subj={dataTestSubj}
                    aria-label={name as string}
                  />
                </EuiToolTip>
              ))}
            {moreMenu && (
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
                attachToAnchor
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
                    initialPanelId={moreMenu.id}
                    panels={[moreMenu]}
                  />
                )}
              </EuiPopover>
            )}
          </div>
        </>
      )}
    </div>
  );
};
