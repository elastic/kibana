/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPopover,
  type PopoverAnchorPosition,
} from '@elastic/eui';
import { useIsServerless, useKibanaVersion } from '@kbn/react-env';
import { useHelpMenuItems } from './help_links_hooks';

interface HeaderHelpMenuProps {
  anchorPosition?: PopoverAnchorPosition;
  renderButton?: (props: {
    isOpen: boolean;
    toggleMenu: () => void;
  }) => NonNullable<React.ReactNode>;
}

export const HeaderHelpMenu = ({
  anchorPosition = 'downRight',
  renderButton,
}: HeaderHelpMenuProps = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isServerless = useIsServerless();
  const kibanaVersion = useKibanaVersion();

  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

  const items = useHelpMenuItems({ closeMenu });

  const button = renderButton ? (
    renderButton({ isOpen, toggleMenu })
  ) : (
    <EuiHeaderSectionItemButton
      aria-expanded={isOpen}
      aria-haspopup="true"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuButtonAriaLabel', {
        defaultMessage: 'Help menu',
      })}
      onClick={toggleMenu}
    >
      <EuiIcon type="question" size="m" aria-hidden={true} />
    </EuiHeaderSectionItemButton>
  );

  return (
    <EuiPopover
      anchorPosition={anchorPosition}
      button={button}
      closePopover={closeMenu}
      data-test-subj="helpMenuButton"
      id="headerHelpMenu"
      isOpen={isOpen}
      repositionOnScroll
      panelPaddingSize="none"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuAriaLabel', {
        defaultMessage: 'Help menu',
      })}
    >
      <EuiContextMenu
        initialPanelId="helpMenu"
        panels={[
          {
            id: 'helpMenu',
            title: (
              <EuiFlexGroup responsive={false}>
                <EuiFlexItem>
                  <FormattedMessage
                    id="core.ui.chrome.headerGlobalNav.helpMenuTitle"
                    defaultMessage="Help"
                  />
                </EuiFlexItem>
                {!isServerless && (
                  <EuiFlexItem grow={false} data-test-subj="kbnVersionString">
                    <FormattedMessage
                      id="core.ui.chrome.headerGlobalNav.helpMenuVersion"
                      defaultMessage="v {version}"
                      values={{ version: kibanaVersion }}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            ),
            items,
          },
        ]}
      />
    </EuiPopover>
  );
};
