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
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { EuiFlyoutProps } from '@elastic/eui';
import { htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

type Menu = 'format' | 'help' | 'filters';
interface ActiveMenu {
  isOpen: boolean;
  menu: Menu;
  button: HTMLElement;
}

export interface MenuManager {
  readonly historyKey: symbol;
  readonly flyoutId: string;
  readonly flyoutMenuProps: EuiFlyoutProps['flyoutMenuProps'];
  readonly activeMenu$: PublishingSubject<ActiveMenu | null>;
  close: (menu: ActiveMenu) => void;
  returnToEditor: () => void;
}

export const initializeMenuManager = (): MenuManager => {
  const flyoutId = htmlIdGenerator('vegaEditor')();
  let filtersButton: HTMLElement | undefined;
  const activeMenu$ = new BehaviorSubject<ActiveMenu | null>(null);
  // EUI forwards the button event but declares its action callback without arguments.
  const toggle = (menu: Menu) => (event?: React.MouseEvent<HTMLElement>) => {
    if (event) {
      if (menu === 'filters') filtersButton = event.currentTarget;
      const activeMenu = activeMenu$.getValue();
      activeMenu$.next({
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
  const filtersLabel = i18n.translate('visTypeVega.editor.editFiltersButtonAriaLabel', {
    defaultMessage: 'Edit filters',
  });
  const flyoutMenuProps: EuiFlyoutProps['flyoutMenuProps'] = {
    title: 'Vega',
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
      {
        iconType: 'filter',
        'aria-label': filtersLabel,
        toolTipContent: filtersLabel,
        onClick: toggle('filters'),
      },
    ],
  };
  return {
    historyKey: Symbol('vegaEditor'),
    flyoutId,
    flyoutMenuProps,
    returnToEditor: () => {
      activeMenu$.next(null);
      if (filtersButton?.isConnected) filtersButton.focus({ preventScroll: true });
    },
    activeMenu$,
    close: (menu: ActiveMenu) => {
      // An outside click from the previous popover must not close a newly activated menu.
      if (activeMenu$.getValue() === menu) activeMenu$.next({ ...menu, isOpen: false });
    },
  };
};
