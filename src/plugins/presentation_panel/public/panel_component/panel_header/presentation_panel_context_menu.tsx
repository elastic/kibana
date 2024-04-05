/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
  EuiSkeletonText,
} from '@elastic/eui';
import { Action, buildContextMenuForActions } from '@kbn/ui-actions-plugin/public';

import { getViewModeSubject, useBatchedOptionalPublishingSubjects } from '@kbn/presentation-publishing';
import { uiActions } from '../../kibana_services';
import { contextMenuTrigger, CONTEXT_MENU_TRIGGER } from '../../panel_actions';
import { getContextMenuAriaLabel } from '../presentation_panel_strings';
import { DefaultPresentationPanelApi, PresentationPanelInternalProps } from '../types';

export const PresentationPanelContextMenu = ({
  api,
  index,
  getActions,
  actionPredicate,
}: {
  index?: number;
  api: DefaultPresentationPanelApi;
  getActions: PresentationPanelInternalProps['getActions'];
  actionPredicate?: (actionId: string) => boolean;
}) => {
  const [menuPanelsLoading, setMenuPanelsLoading] = useState(false);
  const [contextMenuActions, setContextMenuActions] = useState<Array<Action<object>>>([]);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean | undefined>(undefined);
  const [contextMenuPanels, setContextMenuPanels] = useState<EuiContextMenuPanelDescriptor[]>([]);

  const [title, parentViewMode] = useBatchedOptionalPublishingSubjects(
    api.panelTitle,

    /**
     * View mode changes often have the biggest influence over which actions will be compatible,
     * so we build and update all actions when the view mode changes. This is temporary, as these
     * actions should eventually all be Frequent Compatibility Change Actions which can track their
     * own dependencies.
     */
    getViewModeSubject(api)
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
      className="embPanel__optionsMenuButton"
      data-test-subj="embeddablePanelToggleMenuIcon"
      aria-label={getContextMenuAriaLabel(title, index)}
      onClick={() => setIsContextMenuOpen((isOpen) => !isOpen)}
      iconType={'boxesHorizontal'}
    />
  );

  return (
    <EuiPopover
      repositionOnScroll
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={ContextMenuButton}
      isOpen={isContextMenuOpen}
      className={contextMenuClasses}
      closePopover={() => setIsContextMenuOpen(false)}
      data-test-subj={
        isContextMenuOpen ? 'embeddablePanelContextMenuOpen' : 'embeddablePanelContextMenuClosed'
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
          initialPanelId="mainMenu"
          panels={contextMenuPanels}
        />
      )}
    </EuiPopover>
  );
};
