/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import type { FC, ReactNode } from 'react';

import { EuiScreenReaderOnly, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SecondaryMenu } from '../secondary_menu';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { useNestedMenu } from './use_nested_menu';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';

export interface PanelIds {
  panelNavigationInstructionsId: string;
  panelEnterSubmenuInstructionsId: string;
}

export type PanelChildren = ReactNode | ((ids: PanelIds) => ReactNode);

export interface PanelProps {
  children: PanelChildren;
  id: string;
  title?: string;
}

export const Panel: FC<PanelProps> = ({ children, id, title }) => {
  const { currentPanel, panelStackDepth, returnFocusId } = useNestedMenu();
  const nestedPanelTestSubj = `${NAVIGATION_SELECTOR_PREFIX}-nestedPanel-${id}`;
  const panelNavigationInstructionsId = useGeneratedHtmlId({
    prefix: `panel-navigation-instructions-${id}`,
  });
  const panelEnterSubmenuInstructionsId = useGeneratedHtmlId({
    prefix: `panel-enter-submenu-instructions-${id}`,
  });
  const isRootPanel = panelStackDepth === 0;

  const navigationInstructions = isRootPanel
    ? i18n.translate('core.ui.chrome.sideNavigation.morePanelInstructions', {
        defaultMessage:
          'You are in the More primary menu dialog. Use Up and Down arrow keys to navigate. Press Escape to exit to the menu trigger.',
      })
    : i18n.translate('core.ui.chrome.sideNavigation.nestedPanelInstructions', {
        defaultMessage:
          'You are in a submenu. Use Up and Down arrow keys to navigate. Press Go back or Escape to exit to the parent menu.',
      });

  const enterSubmenuInstructions = i18n.translate(
    'core.ui.chrome.sideNavigation.panelEnterSubmenuInstruction',
    {
      defaultMessage: 'Press Enter to go to the submenu.',
    }
  );

  const panelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (currentPanel !== id) return;

      // If we have a return focus id, we focus the trigger element
      if (returnFocusId && node) {
        const triggerElement = node.querySelector<HTMLElement>(`#${CSS.escape(returnFocusId)}`);
        if (triggerElement) return triggerElement.focus();
      }

      // If we are at the root panel, we don't need to focus anything
      if (isRootPanel) return;

      // Otherwise, we focus the first focusable element in the panel
      if (node) {
        const elements = getFocusableElements(node);
        elements[0]?.focus();
      }
    },
    [currentPanel, id, returnFocusId, isRootPanel]
  );

  const renderChildren = () => {
    if (typeof children === 'function') {
      return children({
        panelNavigationInstructionsId,
        panelEnterSubmenuInstructionsId,
      });
    }
    return children;
  };

  if (currentPanel !== id) return null;

  if (title) {
    return (
      <SecondaryMenu
        data-test-subj={nestedPanelTestSubj}
        ref={panelRef}
        title={title}
        isPanel={false}
      >
        <EuiScreenReaderOnly>
          <p id={panelNavigationInstructionsId}>{navigationInstructions}</p>
        </EuiScreenReaderOnly>
        <EuiScreenReaderOnly>
          <p id={panelEnterSubmenuInstructionsId}>{enterSubmenuInstructions}</p>
        </EuiScreenReaderOnly>
        {renderChildren()}
      </SecondaryMenu>
    );
  }

  return (
    <div data-test-subj={nestedPanelTestSubj} ref={panelRef}>
      <EuiScreenReaderOnly>
        <p id={panelNavigationInstructionsId}>{navigationInstructions}</p>
      </EuiScreenReaderOnly>
      {renderChildren()}
    </div>
  );
};
