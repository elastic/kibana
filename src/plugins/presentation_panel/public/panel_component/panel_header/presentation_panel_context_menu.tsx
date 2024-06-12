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

import {
  getViewModeSubject,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';
import { contextMenuTrigger } from '../../panel_actions';
import { getContextMenuAriaLabel } from '../presentation_panel_strings';
import { DefaultPresentationPanelApi } from '../types';

export const PresentationPanelContextMenu = ({
  api,
  index,
  contextMenuActions,
}: {
  index?: number;
  api: DefaultPresentationPanelApi | null;
  contextMenuActions: Array<Action<object>>;
}) => {
  const [menuPanelsLoading, setMenuPanelsLoading] = useState<boolean>(true);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean>(false);
  const [contextMenuPanels, setContextMenuPanels] = useState<EuiContextMenuPanelDescriptor[]>([]);

  const [title] = useBatchedOptionalPublishingSubjects(
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

      setMenuPanelsLoading(false);
      setContextMenuPanels(menuPanels);
    })();
  }, [api, contextMenuActions]);

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
          initialPanelId={'mainMenu'}
          panels={contextMenuPanels}
        />
      )}
    </EuiPopover>
  );
};
