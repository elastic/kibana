/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { getFlyoutManagerStore, htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { apiPublishesWritableUnifiedSearch } from '@kbn/presentation-publishing';
import { EMBEDDABLE_EDITOR_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { triggers, type ActionExecutionMeta } from '@kbn/ui-actions-plugin/public';
import { core, uiActions } from '../kibana_services';
import { EDITOR_MENU_EDIT_FILTERS_ACTION } from './constants';
import { FiltersFlyoutFrame } from './filters_flyout_frame';
import type {
  ActiveEditorMenu,
  EditorFiltersBodyProps,
  EditorMenuActionContext,
  EditorMenuDescriptor,
  EditorMenuItem,
  EditorMenuManager,
  InitializeEditorMenuManagerParams,
} from './types';

const MENU_CHROME: Record<EditorMenuItem, { iconType: string; order: number }> = {
  options: { iconType: 'gear', order: 30 },
  help: { iconType: 'question', order: 20 },
  filters: { iconType: 'filter', order: 10 },
};

const defaultMenuLabel = (menu: EditorMenuItem): string => {
  switch (menu) {
    case 'options':
      return i18n.translate('embeddableApi.editorMenu.optionsButtonLabel', {
        defaultMessage: 'Options',
      });
    case 'help':
      return i18n.translate('embeddableApi.editorMenu.helpButtonLabel', {
        defaultMessage: 'Help',
      });
    case 'filters':
      return i18n.translate('embeddableApi.editorMenu.filtersButtonLabel', {
        defaultMessage: 'Edit filters',
      });
  }
};

/** Builds editor flyout menu buttons from `supportedMenus` without loading action modules. */
export const initializeEditorMenuManager = ({
  editorType,
  flyoutType = 'push',
  api,
  menuActionIds,
  menuLabels,
  supportedMenus,
  title,
}: InitializeEditorMenuManagerParams): EditorMenuManager => {
  const flyoutId = htmlIdGenerator('embeddableEditor')();
  const historyKey = Symbol('embeddableEditor');
  const activeMenu$ = new BehaviorSubject<ActiveEditorMenu | null>(null);
  let filtersButton: HTMLElement | undefined;
  let filtersOverlay: OverlayRef | undefined;
  let filtersBody: React.ReactElement | undefined;
  let publishFiltersBody: ((body: React.ReactElement) => void) | undefined;
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
  const returnFromFilters = () => {
    if (disposed) return;
    // Pop this sibling session. Closing the overlay directly unmounts a main flyout
    // that is still registered and would end every managed session.
    getFlyoutManagerStore().goBack();
  };
  const editorFlyoutWidth = (): { size: number; maxWidth: number } | undefined => {
    const store = getFlyoutManagerStore().getState();
    const recorded = store.flyouts.find((flyout) => flyout.flyoutId === flyoutId)?.width;
    const editor = document.getElementById(flyoutId);
    const measured = recorded && recorded > 0 ? recorded : editor?.getBoundingClientRect().width;
    if (!measured || measured <= 0) return undefined;
    const size = Math.round(measured);
    const parsedMax = editor ? Number.parseFloat(getComputedStyle(editor).maxWidth) : Number.NaN;
    const maxWidth =
      Number.isFinite(parsedMax) && parsedMax > 0 ? Math.max(Math.round(parsedMax), size) : size;
    return { size, maxWidth };
  };
  const subscribeFiltersBody = (publish: (body: React.ReactElement) => void) => {
    publishFiltersBody = publish;
    if (filtersBody) publish(filtersBody);
    return () => {
      if (publishFiltersBody === publish) publishFiltersBody = undefined;
    };
  };
  const mountFiltersBody = (Body: React.ComponentType<EditorFiltersBodyProps>) => {
    if (disposed) return;
    const element = React.createElement(Body, {
      closeFlyout: returnFromFilters,
      menuManager: manager,
    });
    filtersBody = element;
    publishFiltersBody?.(element);
  };
  const editor: EditorMenuDescriptor = {
    type: editorType,
    toggleOptions: (anchor) => toggle('options', anchor),
    toggleHelp: (anchor) => toggle('help', anchor),
    mountFiltersBody,
  };
  const runMenuAction = (menu: EditorMenuItem, anchor: HTMLElement) => {
    const actionId =
      menuActionIds?.[menu] ?? (menu === 'filters' ? EDITOR_MENU_EDIT_FILTERS_ACTION : undefined);
    if (!actionId) return;
    // Loaders run on click. Callers open the filters shell before this promise resolves.
    void uiActions
      .getAction(actionId)
      .then((action) => {
        if (disposed) return;
        return action.execute({
          anchor,
          api,
          editor,
          trigger: triggers[EMBEDDABLE_EDITOR_MENU_TRIGGER],
        } as EditorMenuActionContext & ActionExecutionMeta);
      })
      .catch((error: unknown) => {
        core.notifications.toasts.addError(
          error instanceof Error ? error : new Error(String(error)),
          {
            title: i18n.translate('embeddableApi.editorMenu.actionErrorTitle', {
              defaultMessage: 'Unable to open the editor menu',
            }),
          }
        );
      });
  };
  const openFiltersFlyout = () => {
    if (disposed || filtersOverlay) return;
    const filtersFlyoutId = `${flyoutId}-filters`;
    const filtersTitle = i18n.translate('embeddableApi.editorMenu.panelLevelFiltersTitle', {
      defaultMessage: 'Panel level filters',
    });
    const editorWidth = editorFlyoutWidth();
    const overlay = core.overlays.openSystemFlyout(
      React.createElement(FiltersFlyoutFrame, {
        readBody: () => filtersBody,
        subscribe: subscribeFiltersBody,
      }),
      {
        id: filtersFlyoutId,
        session: 'start',
        historyKey,
        size: editorWidth?.size ?? 'm',
        maxWidth: editorWidth?.maxWidth ?? 800,
        paddingSize: 'm',
        type: flyoutType,
        ownFocus: flyoutType !== 'overlay',
        resizable: true,
        outsideClickCloses: false,
        hideCloseButton: true,
        'data-test-subj': 'editorFiltersFlyout',
        'aria-label': filtersTitle,
        onActive: () => {
          requestAnimationFrame(() => {
            document.querySelector<HTMLButtonElement>(`#${filtersFlyoutId} button`)?.focus();
          });
        },
        flyoutMenuProps: {
          title: filtersTitle,
          hideTitle: false,
          hideCloseButton: true,
          trailingActions: [
            {
              iconType: 'cross',
              'aria-label': i18n.translate('embeddableApi.editorMenu.closeFiltersButtonAriaLabel', {
                defaultMessage: 'Close filters',
              }),
              onClick: returnFromFilters,
            },
          ],
        },
      }
    );
    filtersOverlay = overlay;
    void overlay.onClose.then(() => {
      if (filtersOverlay === overlay) filtersOverlay = undefined;
    });
  };
  const openFilters = (anchor: HTMLElement) => {
    if (disposed || filtersOverlay) return;
    filtersButton = anchor;
    activeMenu$.next(null);
    openFiltersFlyout();
  };
  const trailingActions = supportedMenus
    .slice()
    // Same contract as EditFiltersAction.isCompatible, evaluated here so the button is known
    // before that action module loads.
    .filter((menu) => menu !== 'filters' || apiPublishesWritableUnifiedSearch(api ?? null))
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
          if (menu === 'filters') openFilters(anchor);
          runMenuAction(menu, anchor);
        },
      };
    });

  const manager: EditorMenuManager = {
    historyKey,
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
      void filtersOverlay?.close();
      filtersOverlay = undefined;
      activeMenu$.complete();
    },
  };
  return manager;
};
