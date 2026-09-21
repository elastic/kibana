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
import type { Action } from '@kbn/ui-actions-plugin/public';
import { EMBEDDABLE_EDITOR_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { core, uiActions } from '../kibana_services';
import type {
  ActiveEditorMenu,
  EditorMenuActionContext,
  EditorMenuDescriptor,
  EditorMenuItem,
  EditorMenuManager,
  InitializeEditorMenuManagerParams,
} from './types';

const notifyUnableToLoadActions = (error: Error) => {
  core.notifications.toasts.addError(error, {
    title: i18n.translate('embeddableApi.editorMenu.unableToLoadActions', {
      defaultMessage: 'Unable to load editor menu actions',
    }),
  });
};

const notifyUnableToExecuteAction = (error: Error) => {
  core.notifications.toasts.addError(error, {
    title: i18n.translate('embeddableApi.editorMenu.unableToExecuteAction', {
      defaultMessage: 'Unable to run editor menu action',
    }),
  });
};

export const initializeEditorMenuManager = async ({
  editorType,
  supportedMenus,
  title,
}: InitializeEditorMenuManagerParams): Promise<EditorMenuManager> => {
  const flyoutId = htmlIdGenerator('embeddableEditor')();
  const activeMenu$ = new BehaviorSubject<ActiveEditorMenu | null>(null);
  let filtersButton: HTMLElement | undefined;
  let disposed = false;

  const toggle = (menu: EditorMenuItem, anchor: HTMLElement) => {
    if (disposed) return;
    if (menu === 'filters') filtersButton = anchor;
    const activeMenu = activeMenu$.getValue();
    activeMenu$.next({
      menu,
      button: anchor,
      isOpen: !(activeMenu?.menu === menu && activeMenu.isOpen),
    });
  };
  const supports = (menu: EditorMenuItem) => supportedMenus.includes(menu);
  const editor: EditorMenuDescriptor = {
    type: editorType,
    ...(supports('options')
      ? { toggleOptions: (anchor: HTMLElement) => toggle('options', anchor) }
      : {}),
    ...(supports('help') ? { toggleHelp: (anchor: HTMLElement) => toggle('help', anchor) } : {}),
    ...(supports('filters')
      ? { openFilters: (anchor: HTMLElement) => toggle('filters', anchor) }
      : {}),
  };
  const trigger = uiActions.getTrigger(EMBEDDABLE_EDITOR_MENU_TRIGGER);
  const context: EditorMenuActionContext = { editor };

  let actions: Action<EditorMenuActionContext>[];
  try {
    actions = (await uiActions.getTriggerCompatibleActions(
      EMBEDDABLE_EDITOR_MENU_TRIGGER,
      context
    )) as Array<Action<EditorMenuActionContext>>;
  } catch (error) {
    const actionError = error instanceof Error ? error : new Error(String(error));
    notifyUnableToLoadActions(actionError);
    throw actionError;
  }

  const actionContext = { ...context, trigger };
  const trailingActions = [...actions]
    .sort((first, second) => (second.order ?? 0) - (first.order ?? 0))
    .map((action) => {
      const label = action.getDisplayName(actionContext);
      return {
        iconType: action.getIconType(actionContext) ?? 'empty',
        'aria-label': label,
        toolTipContent: action.getDisplayNameTooltip?.(actionContext) || label,
        // EUI forwards the click event, although its public callback type has no arguments.
        onClick: (event?: React.MouseEvent<HTMLElement>) => {
          const anchor = event?.currentTarget;
          if (!anchor || disposed) return;
          void action.execute({ ...actionContext, anchor }).catch((error) => {
            notifyUnableToExecuteAction(error instanceof Error ? error : new Error(String(error)));
          });
        },
      };
    });

  return {
    historyKey: Symbol('embeddableEditor'),
    flyoutId,
    flyoutMenuProps: { title, trailingActions },
    activeMenu$,
    close: (menu) => {
      if (!disposed && activeMenu$.getValue() === menu) {
        activeMenu$.next({ ...menu, isOpen: false });
      }
    },
    returnToEditor: () => {
      if (disposed) return;
      activeMenu$.next(null);
      if (filtersButton?.isConnected) filtersButton.focus({ preventScroll: true });
    },
    dispose: () => {
      disposed = true;
      activeMenu$.complete();
    },
  };
};
