/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { BehaviorSubject } from 'rxjs';
import { htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ActiveEditorMenu,
  EditorMenuDescriptor,
  EditorMenuItem,
  EditorMenuManager,
  InitializeEditorMenuManagerParams,
} from './types';

const MENU_CHROME: Record<EditorMenuItem, { iconType: string; order: number }> = {
  options: { iconType: 'gear', order: 30 },
  help: { iconType: 'question', order: 20 },
};

const defaultMenuLabel = (menu: EditorMenuItem): string => {
  switch (menu) {
    case 'options':
      return i18n.translate('presentationUtil.editorMenu.optionsButtonLabel', {
        defaultMessage: 'Options',
      });
    case 'help':
      return i18n.translate('presentationUtil.editorMenu.helpButtonLabel', {
        defaultMessage: 'Help',
      });
  }
};

/** Builds editor flyout menu buttons from `supportedMenus` without loading action modules. */
export const initializeEditorMenuManager = ({
  services,
  editorType,
  api,
  menuActionIds,
  menuLabels,
  supportedMenus,
  title,
}: InitializeEditorMenuManagerParams): EditorMenuManager => {
  const flyoutId = htmlIdGenerator('presentationEditor')();
  const historyKey = Symbol('presentationEditor');
  const activeMenu$ = new BehaviorSubject<ActiveEditorMenu | null>(null);
  const panelApi$ = new BehaviorSubject<unknown>(api);
  let disposed = false;

  const toggle = (menu: ActiveEditorMenu['menu'], anchor: HTMLElement) => {
    if (disposed) return;
    const activeMenu = activeMenu$.getValue();
    activeMenu$.next({
      menu,
      button: anchor,
      isOpen: !(activeMenu?.menu === menu && activeMenu.isOpen),
    });
  };
  const editor: EditorMenuDescriptor = {
    type: editorType,
    toggleOptions: (anchor) => toggle('options', anchor),
    toggleHelp: (anchor) => toggle('help', anchor),
  };
  const runMenuAction = (menu: EditorMenuItem, anchor: HTMLElement) => {
    const actionId = menuActionIds?.[menu];
    if (!actionId) return;
    void services
      .getAction(actionId)
      .then((action) => {
        if (disposed) return;
        return action.execute({
          anchor,
          api: panelApi$.getValue(),
          editor,
          trigger: services.trigger,
        });
      })
      .catch((error: unknown) => {
        services.notifications.toasts.addError(
          error instanceof Error ? error : new Error(String(error)),
          {
            title: i18n.translate('presentationUtil.editorMenu.actionErrorTitle', {
              defaultMessage: 'Unable to open the editor menu',
            }),
          }
        );
      });
  };
  const trailingActions = supportedMenus
    .slice()
    .sort((first, second) => MENU_CHROME[second].order - MENU_CHROME[first].order)
    .map((menu) => {
      const label = menuLabels?.[menu] ?? defaultMenuLabel(menu);
      return {
        iconType: MENU_CHROME[menu].iconType,
        'aria-label': label,
        toolTipContent: label,
        // EUI forwards the click event, although its public callback type has no arguments.
        onClick: (event?: React.MouseEvent<HTMLElement>) => {
          const anchor = event?.currentTarget;
          if (!anchor || disposed) return;
          runMenuAction(menu, anchor);
        },
      };
    });

  const manager: EditorMenuManager = {
    historyKey,
    flyoutId,
    flyoutMenuProps: { title, trailingActions },
    activeMenu$,
    panelApi$,
    close: (menu) => {
      if (!disposed && activeMenu$.getValue() === menu) {
        activeMenu$.next({ ...menu, isOpen: false });
      }
    },
    returnToEditor: () => {
      if (disposed) return;
      activeMenu$.next(null);
    },
    setPanelApi: (nextApi) => {
      panelApi$.next(nextApi);
    },
    dispose: () => {
      disposed = true;
      activeMenu$.complete();
    },
  };
  return manager;
};
