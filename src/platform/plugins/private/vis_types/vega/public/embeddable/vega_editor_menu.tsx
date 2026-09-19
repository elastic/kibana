/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiWrappingPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import type { MenuManager } from './menu_manager';
import type { VegaActionsMenuProps } from '../components/vega_actions_menu';
import { VegaActionsMenuContent } from '../components/vega_actions_menu';
import { VegaHelpMenuContent } from '../components/vega_help_menu';

export const VegaEditorMenu = ({
  menuManager,
  formatHJson,
  formatJson,
}: VegaActionsMenuProps & { menuManager: MenuManager }): React.ReactElement | null => {
  const [activeMenu] = useBatchedPublishingSubjects(menuManager.activeMenu$);
  if (!activeMenu || activeMenu.menu === 'filters') return null;

  const { menu, button, isOpen } = activeMenu;
  const closePopover = () => menuManager.close(activeMenu);
  const formatAndClose = (format: () => void) => () => {
    format();
    closePopover();
  };
  return (
    <EuiWrappingPopover
      key={menu}
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      focusTrapProps={{
        returnFocus: () => {
          // Restore focus after the popover focus trap has finished deactivating.
          requestAnimationFrame(() => {
            const currentMenu = menuManager.activeMenu$.getValue();
            if (!currentMenu?.isOpen && currentMenu?.button === button && button.isConnected) {
              button.focus({ preventScroll: true });
            }
          });
          return false;
        },
      }}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={
        menu === 'format'
          ? i18n.translate('visTypeVega.editor.vegaEditorOptionsPopoverAriaLabel', {
              defaultMessage: 'Vega editor options',
            })
          : i18n.translate('visTypeVega.editor.vegaHelpPopoverAriaLabel', {
              defaultMessage: 'Vega help',
            })
      }
    >
      {menu === 'format' ? (
        <VegaActionsMenuContent
          formatHJson={formatAndClose(formatHJson)}
          formatJson={formatAndClose(formatJson)}
        />
      ) : (
        <VegaHelpMenuContent closePopover={closePopover} />
      )}
    </EuiWrappingPopover>
  );
};
