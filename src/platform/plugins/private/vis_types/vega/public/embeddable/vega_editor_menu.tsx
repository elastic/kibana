/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useSyncExternalStore } from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';
import { EuiWrappingPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VegaActionsMenuProps } from '../components/vega_actions_menu';
import { VegaActionsMenuContent } from '../components/vega_actions_menu';
import { VegaHelpMenuContent } from '../components/vega_help_menu';

type Menu = 'format' | 'help';
interface ActiveMenu {
  isOpen: boolean;
  menu: Menu;
  button: HTMLElement;
}

export interface VegaEditorMenuController {
  readonly flyoutMenuProps: EuiFlyoutProps['flyoutMenuProps'];
  getSnapshot: () => ActiveMenu | null;
  subscribe: (listener: () => void) => () => void;
  close: (menu: ActiveMenu) => void;
}

export const createVegaEditorMenu = (): VegaEditorMenuController => {
  let activeMenu: ActiveMenu | null = null;
  const listeners = new Set<() => void>();
  const update = (next: ActiveMenu | null) => {
    activeMenu = next;
    listeners.forEach((listener) => listener());
  };
  // EUI forwards the button event but declares its action callback without arguments.
  const toggle = (menu: Menu) => (event?: React.MouseEvent<HTMLElement>) => {
    if (event) {
      update({
        menu,
        button: event.currentTarget,
        isOpen: !(activeMenu?.menu === menu && activeMenu.isOpen),
      });
    }
  };
  const optionsLabel = i18n.translate('visTypeVega.editor.vegaEditorOptionsButtonAriaLabel', {
    defaultMessage: 'Vega editor options',
  });
  const helpLabel = i18n.translate('visTypeVega.editor.vegaHelpButtonAriaLabel', {
    defaultMessage: 'Vega help',
  });
  const flyoutMenuProps: EuiFlyoutProps['flyoutMenuProps'] = {
    trailingActions: [
      {
        iconType: 'gear',
        'aria-label': optionsLabel,
        toolTipContent: optionsLabel,
        onClick: toggle('format'),
      },
      {
        iconType: 'question',
        'aria-label': helpLabel,
        toolTipContent: helpLabel,
        onClick: toggle('help'),
      },
    ],
  };
  return {
    flyoutMenuProps,
    getSnapshot: () => activeMenu,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    close: (menu: ActiveMenu) => {
      // An outside click from the previous popover must not close a newly activated menu.
      if (activeMenu === menu) update({ ...menu, isOpen: false });
    },
  };
};

export const VegaEditorMenu = ({
  controller,
  formatHJson,
  formatJson,
}: VegaActionsMenuProps & { controller: VegaEditorMenuController }): React.ReactElement | null => {
  const activeMenu = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  if (!activeMenu) return null;

  const { menu, button, isOpen } = activeMenu;
  const closePopover = () => controller.close(activeMenu);
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
          const currentMenu = controller.getSnapshot();
          if (!currentMenu?.isOpen && currentMenu?.button === button && button.isConnected) {
            button.focus({ preventScroll: true });
          }
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
