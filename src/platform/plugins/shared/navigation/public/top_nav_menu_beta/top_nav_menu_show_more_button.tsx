/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEvent } from 'react';
import React, { useState } from 'react';
import { isFunction, upperFirst } from 'lodash';
import { EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TopNavMenuItemBetaType } from './types';

interface TopNavMenuShowMoreButtonProps {
  closePopover: () => void;
  items: TopNavMenuItemBetaType[];
}

export const TopNavMenuShowMoreButton = ({
  closePopover,
  items,
}: TopNavMenuShowMoreButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const isDisabled = ({ disableButton }: TopNavMenuItemBetaType) =>
    Boolean(isFunction(disableButton) ? disableButton() : disableButton);

  const handleClick = (e: MouseEvent<Element>, item: TopNavMenuItemBetaType) => {
    if (isDisabled(item)) return;

    item.run(e.currentTarget as HTMLElement);

    handleClosePopover();
  };

  const handleClosePopover = () => {
    setIsOpen(false);
    closePopover();
  };

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={handleClosePopover}
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal" // Change to "ellipsis" when available in EUI
          size="s"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={i18n.translate('navigation.topNavMenuBeta.showMoreButtonLabel', {
            defaultMessage: 'Show more',
          })}
          color="text"
        />
      }
      panelPaddingSize="none"
      attachToAnchor
      anchorPosition="downLeft"
      panelStyle={{ maxWidth: 200 }}
    >
      <EuiContextMenuPanel
        size="s"
        items={items.map((item, i) => (
          <EuiContextMenuItem
            key={`nav-menu-${i}`}
            icon={item?.iconType}
            onClick={item?.href ? undefined : (e: MouseEvent<Element>) => handleClick(e, item)}
            href={item?.href}
            target={item?.target}
            disabled={isDisabled(item)}
          >
            {upperFirst(item.label)}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};
