/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiFlexItem, EuiPopover, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import type { VegaActionsMenuProps } from '../components/vega_actions_menu';
import { VegaActionsMenuContent } from '../components/vega_actions_menu';
import { VegaHelpMenuContent } from '../components/vega_help_menu';

type Menu = 'format' | 'help';

export const VegaEditorMenu = ({
  formatHJson,
  formatJson,
}: VegaActionsMenuProps): React.ReactElement => {
  const [activeMenu, setActiveMenu] = useState<Menu | null>(null);
  const closeMenu = (menu: Menu) => {
    setActiveMenu((current) => (current === menu ? null : current));
  };
  const formatAndClose = (format: () => void) => () => {
    format();
    closeMenu('format');
  };
  const menus = [
    {
      id: 'format',
      icon: 'gear',
      buttonLabel: i18n.translate('visTypeVega.editor.vegaEditorOptionsButtonAriaLabel', {
        defaultMessage: 'Vega editor options',
      }),
      popoverLabel: i18n.translate('visTypeVega.editor.vegaEditorOptionsPopoverAriaLabel', {
        defaultMessage: 'Vega editor options',
      }),
      content: (
        <VegaActionsMenuContent
          formatHJson={formatAndClose(formatHJson)}
          formatJson={formatAndClose(formatJson)}
        />
      ),
    },
    {
      id: 'help',
      icon: 'question',
      buttonLabel: i18n.translate('visTypeVega.editor.vegaHelpButtonAriaLabel', {
        defaultMessage: 'Vega help',
      }),
      popoverLabel: i18n.translate('visTypeVega.editor.vegaHelpPopoverAriaLabel', {
        defaultMessage: 'Vega help',
      }),
      content: <VegaHelpMenuContent closePopover={() => closeMenu('help')} />,
    },
  ] as const;

  return (
    <>
      {menus.map(({ id, icon, buttonLabel, popoverLabel, content }) => (
        <EuiFlexItem key={id} grow={false}>
          <EuiPopover
            button={
              <EuiToolTip content={buttonLabel} disableScreenReaderOutput>
                <ToolbarButton
                  as="iconButton"
                  iconType={icon}
                  size="s"
                  aria-label={buttonLabel}
                  onClick={() => setActiveMenu((current) => (current === id ? null : id))}
                />
              </EuiToolTip>
            }
            isOpen={activeMenu === id}
            closePopover={() => closeMenu(id)}
            panelPaddingSize="none"
            anchorPosition="downRight"
            aria-label={popoverLabel}
          >
            {content}
          </EuiPopover>
        </EuiFlexItem>
      ))}
    </>
  );
};
