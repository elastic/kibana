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

import { uiActions } from '../../kibana_services';
import { EmbeddablePanelProps, PanelUniversalActions } from '../types';
import { getContextMenuAriaLabel } from '../embeddable_panel_strings';
import { useSelectFromEmbeddableInput } from '../use_select_from_embeddable';
import { IEmbeddable, contextMenuTrigger, CONTEXT_MENU_TRIGGER, ViewMode } from '../..';

const sortByOrderField = (
  { order: orderA }: { order?: number },
  { order: orderB }: { order?: number }
) => (orderB || 0) - (orderA || 0);

const removeById =
  (disabledActions: string[]) =>
  ({ id }: { id: string }) =>
    disabledActions.indexOf(id) === -1;

export const EmbeddablePanelContextMenu = ({
  index,
  embeddable,
  getActions,
  actionPredicate,
  universalActions,
}: {
  index?: number;
  embeddable: IEmbeddable;
  universalActions: PanelUniversalActions;
  getActions: EmbeddablePanelProps['getActions'];
  actionPredicate?: (actionId: string) => boolean;
}) => {
  const [menuPanelsLoading, setMenuPanelsLoading] = useState(false);
  const [contextMenuActions, setContextMenuActions] = useState<Array<Action<object>>>([]);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean | undefined>(undefined);
  const [contextMenuPanels, setContextMenuPanels] = useState<EuiContextMenuPanelDescriptor[]>([]);

  const title = useSelectFromEmbeddableInput('title', embeddable);
  const viewMode = useSelectFromEmbeddableInput('viewMode', embeddable);

  useEffect(() => {
    /**
     * isContextMenuOpen starts as undefined which allows this use effect to run on mount. This
     * is required so that showNotification is calculated on mount.
     */
    if (isContextMenuOpen === false) return;

    setMenuPanelsLoading(true);
    let canceled = false;
    (async () => {
      /**
       * Build and update all actions
       */
      const regularActions = await (async () => {
        if (getActions) return await getActions(CONTEXT_MENU_TRIGGER, { embeddable });
        return (
          (await uiActions.getTriggerCompatibleActions(CONTEXT_MENU_TRIGGER, {
            embeddable,
          })) ?? []
        );
      })();
      if (canceled) return;
      let allActions = regularActions.concat(
        Object.values(universalActions ?? {}) as Array<Action<object>>
      );

      const { disabledActions } = embeddable.getInput();
      if (disabledActions) {
        const removeDisabledActions = removeById(disabledActions);
        allActions = allActions.filter(removeDisabledActions);
      }
      allActions.sort(sortByOrderField);

      if (actionPredicate) {
        allActions = allActions.filter(({ id }) => actionPredicate(id));
      }

      /**
       * Build context menu panel from actions
       */
      const panels = await buildContextMenuForActions({
        actions: allActions.map((action) => ({
          action,
          context: { embeddable },
          trigger: contextMenuTrigger,
        })),
        closeMenu: () => setIsContextMenuOpen(false),
      });
      if (canceled) return;

      setMenuPanelsLoading(false);
      setContextMenuActions(allActions);
      setContextMenuPanels(panels);
    })();
    return () => {
      canceled = true;
    };
  }, [actionPredicate, embeddable, getActions, isContextMenuOpen, universalActions]);

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
      iconType={viewMode === ViewMode.VIEW ? 'boxesHorizontal' : 'gear'}
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
          title={i18n.translate('embeddableApi.panel.contextMenu.loadingTitle', {
            defaultMessage: 'Options',
          })}
        >
          <EuiContextMenuItem>
            <EuiSkeletonText />
          </EuiContextMenuItem>
        </EuiContextMenuPanel>
      ) : (
        <EuiContextMenu initialPanelId="mainMenu" panels={contextMenuPanels} />
      )}
    </EuiPopover>
  );
};
