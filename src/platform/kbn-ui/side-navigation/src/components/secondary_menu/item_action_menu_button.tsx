/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { EuiButtonIcon, EuiPopover, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  renderSideNavItemActionMenu,
  subscribeSideNavItemActionMenuRenderers,
} from '@kbn/core-chrome-browser';

import type { PanelHeaderAction } from '../../../types';

export interface SecondaryMenuItemActionMenuButtonProps
  extends Pick<PanelHeaderAction, 'aria-label' | 'data-test-subj' | 'iconType' | 'id'> {
  isHighlighted: boolean;
  itemActionMenuContext?: Record<string, string>;
  opensItemActionMenu: string;
}

export const SecondaryMenuItemActionMenuButton = ({
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  iconType,
  id,
  isHighlighted,
  itemActionMenuContext = {},
  opensItemActionMenu,
}: SecondaryMenuItemActionMenuButtonProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [, rerenderMenus] = useState(0);

  useEffect(() => {
    return subscribeSideNavItemActionMenuRenderers(() => {
      rerenderMenus((version) => version + 1);
    });
  }, []);

  const closePopover = () => setIsOpen(false);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsOpen((open) => !open);
  };

  const panelStyles = css`
    min-width: ${euiTheme.size.xl * 4}px;
  `;

  return (
    <EuiPopover
      anchorPosition="leftUp"
      button={
        <EuiButtonIcon
          aria-label={ariaLabel}
          color={isHighlighted ? 'primary' : 'text'}
          data-test-subj={dataTestSubj}
          display={isHighlighted ? 'base' : 'empty'}
          iconType={iconType}
          id={id}
          onClick={handleClick}
          size="xs"
        />
      }
      closePopover={closePopover}
      isOpen={isOpen}
      panelPaddingSize="none"
    >
      <div css={panelStyles}>
        {renderSideNavItemActionMenu(opensItemActionMenu, {
          context: itemActionMenuContext,
          onClose: closePopover,
        })}
      </div>
    </EuiPopover>
  );
};
