/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import { Subscription } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import useMountedState from 'react-use/lib/useMountedState';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
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

export const useEmbeddablePanelContextMenu = ({
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
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuActions, setContextMenuActions] = useState<Array<Action<object>>>([]);
  const [contextMenuPanels, setContextMenuPanels] = useState<EuiContextMenuPanelDescriptor[]>([]);

  const title = useSelectFromEmbeddableInput('title', embeddable);
  const viewMode = useSelectFromEmbeddableInput('viewMode', embeddable);

  const mounted = useMountedState();

  const getAllPanelActions = useCallback(async () => {
    let regularActions = await (async () => {
      if (getActions) return await getActions(CONTEXT_MENU_TRIGGER, { embeddable });
      return (
        (await uiActions.getTriggerCompatibleActions(CONTEXT_MENU_TRIGGER, {
          embeddable,
        })) ?? []
      );
    })();
    const { disabledActions } = embeddable.getInput();
    if (disabledActions) {
      const removeDisabledActions = removeById(disabledActions);
      regularActions = regularActions.filter(removeDisabledActions);
    }
    let sortedActions = regularActions
      .concat(Object.values(universalActions || {}) as Array<Action<object>>)
      .sort(sortByOrderField);

    if (actionPredicate) {
      sortedActions = sortedActions.filter(({ id }) => actionPredicate(id));
    }
    return sortedActions;
  }, [actionPredicate, embeddable, universalActions, getActions]);

  const maybeUpdatePanelActions = useCallback(async () => {
    const newActions = await getAllPanelActions();
    if (!mounted()) return;
    setContextMenuActions((currentActions) =>
      deepEqual(currentActions, newActions) ? currentActions : newActions
    );
  }, [getAllPanelActions, mounted]);

  /**
   * On embeddable creation get all actions then subscribe to all
   * input updates to refresh them
   */
  useEffect(() => {
    let subscription: Subscription;

    maybeUpdatePanelActions().then(() => {
      if (mounted()) {
        /**
         * since any piece of state could theoretically change which actions are available we need to
         * recalculate them on any input change or any parent input change.
         */
        subscription = embeddable.getInput$().subscribe(() => maybeUpdatePanelActions());
        if (embeddable.parent) {
          subscription.add(
            embeddable.parent.getInput$().subscribe(() => maybeUpdatePanelActions())
          );
        }
      }
    });
    return () => {
      subscription?.unsubscribe();
    };
  }, [embeddable, getAllPanelActions, maybeUpdatePanelActions, mounted]);

  /**
   * When actions are updated, build and set panels
   */
  useEffect(() => {
    (async () => {
      const panels = await buildContextMenuForActions({
        actions: contextMenuActions.map((action) => ({
          action,
          context: { embeddable },
          trigger: contextMenuTrigger,
        })),
        closeMenu: () => setIsContextMenuOpen(false),
      });
      if (mounted()) setContextMenuPanels(panels);
    })();
  }, [contextMenuActions, embeddable, mounted]);

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
      onClick={() => {
        maybeUpdatePanelActions().then(() => {
          if (!mounted()) return;
          setIsContextMenuOpen((isOpen) => !isOpen);
        });
      }}
      data-test-subj="embeddablePanelToggleMenuIcon"
      aria-label={getContextMenuAriaLabel(title, index)}
      iconType={viewMode === ViewMode.VIEW ? 'boxesHorizontal' : 'gear'}
    />
  );

  const embeddablePanelContextMenu = (
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
      <EuiContextMenu initialPanelId="mainMenu" panels={contextMenuPanels} />
    </EuiPopover>
  );

  return embeddablePanelContextMenu;
};
