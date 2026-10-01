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

import type { IconType } from '@elastic/eui';
import { EuiScreenReaderOnly, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { SecondaryMenu } from '../secondary_menu';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { scrollLayoutStyles, useScroll } from '../../hooks/use_scroll';
import { useNestedMenu } from './use_nested_menu';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';

export interface PanelIds {
  panelNavigationInstructionsId: string;
  panelEnterSubmenuInstructionsId: string;
}

export type PanelChildren = ReactNode | ((ids: PanelIds) => ReactNode);

export interface PanelProps {
  children: PanelChildren;
  /**
   * Content shown below the scrolling panel body.
   */
  footer?: ReactNode;
  /**
   * Content shown above the scrolling panel body when the panel has no `title`.
   */
  header?: PanelChildren;
  /**
   * Icon shown beside the panel title when `title` is set.
   */
  iconType?: IconType;
  id: string;
  title?: string;
}

export const Panel: FC<PanelProps> = ({ children, footer, header, iconType, id, title }) => {
  const { currentPanel, panelStackDepth, returnFocusId } = useNestedMenu();
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useScroll(true);
  const nestedPanelTestSubj = `${NAVIGATION_SELECTOR_PREFIX}-nestedPanel-${id}`;
  const panelNavigationInstructionsId = useGeneratedHtmlId({
    prefix: `panel-navigation-instructions-${id}`,
  });
  const panelEnterSubmenuInstructionsId = useGeneratedHtmlId({
    prefix: `panel-enter-submenu-instructions-${id}`,
  });
  const isRootPanel = panelStackDepth === 0;

  const navigationInstructions = isRootPanel
    ? i18n.translate('kbnUI.sideNavigation.morePanelInstructions', {
        defaultMessage:
          'You are in the More primary menu dialog. Use Up and Down arrow keys to navigate. Press Escape to exit to the menu trigger.',
      })
    : i18n.translate('kbnUI.sideNavigation.nestedPanelInstructions', {
        defaultMessage:
          'You are in a submenu. Use Up and Down arrow keys to navigate. Press Go back or Escape to exit to the parent menu.',
      });

  const enterSubmenuInstructions = i18n.translate(
    'kbnUI.sideNavigation.panelEnterSubmenuInstruction',
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

  const renderContent = (content: PanelChildren) => {
    if (typeof content === 'function') {
      return content({
        panelNavigationInstructionsId,
        panelEnterSubmenuInstructionsId,
      });
    }
    return content;
  };

  if (currentPanel !== id) return null;

  const footerStyles = css`
    flex-shrink: 0;
    // Less top padding since the section above already ends with padding, mirrors the menu header
    padding: ${euiTheme.size.xxs} ${euiTheme.size.m} ${euiTheme.size.m};
  `;

  const footerNode = footer ? (
    <div css={footerStyles} data-test-subj={`${nestedPanelTestSubj}-footer`}>
      {footer}
    </div>
  ) : null;

  if (title) {
    return (
      <SecondaryMenu
        data-test-subj={nestedPanelTestSubj}
        footer={footerNode}
        iconType={iconType}
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
        {renderContent(children)}
      </SecondaryMenu>
    );
  }

  return (
    <div css={scrollLayoutStyles} data-test-subj={nestedPanelTestSubj} ref={panelRef}>
      {renderContent(header)}
      <div css={scrollStyles}>
        <EuiScreenReaderOnly>
          <p id={panelNavigationInstructionsId}>{navigationInstructions}</p>
        </EuiScreenReaderOnly>
        {renderContent(children)}
      </div>
      {footerNode}
    </div>
  );
};
