/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';

export interface PanelOptionsMenuProps {
  panelDescriptor?: EuiContextMenuPanelDescriptor;
  close?: boolean;
  isViewMode?: boolean;
  title?: string;
}

export const PanelOptionsMenu: React.FC<PanelOptionsMenuProps> = ({
  panelDescriptor,
  close,
  isViewMode,
  title,
}) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!close) setOpen(false);
  }, [close]);

  const handleContextMenuClick = () => {
    setOpen((isOpen) => !isOpen);
  };

  const handlePopoverClose = () => {
    setOpen(false);
  };

  const enhancedAriaLabel = i18n.translate(
    'embeddableApi.panel.optionsMenu.panelOptionsButtonEnhancedAriaLabel',
    {
      defaultMessage: 'Panel options for {title}',
      values: { title },
    }
  );
  const ariaLabelWithoutTitle = i18n.translate(
    'embeddableApi.panel.optionsMenu.panelOptionsButtonAriaLabel',
    { defaultMessage: 'Panel options' }
  );

  const button = (
    <EuiButtonIcon
      iconType={isViewMode ? 'boxesHorizontal' : 'gear'}
      color="text"
      className="embPanel__optionsMenuButton"
      aria-label={title ? enhancedAriaLabel : ariaLabelWithoutTitle}
      data-test-subj="embeddablePanelToggleMenuIcon"
      onClick={handleContextMenuClick}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={open}
      closePopover={handlePopoverClose}
      panelPaddingSize="none"
      anchorPosition="downRight"
      data-test-subj={open ? 'embeddablePanelContextMenuOpen' : 'embeddablePanelContextMenuClosed'}
    >
      <EuiContextMenu initialPanelId="mainMenu" panels={panelDescriptor ? [panelDescriptor] : []} />
    </EuiPopover>
  );
};
