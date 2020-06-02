/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
      withTitle
    >
      <EuiContextMenu initialPanelId="mainMenu" panels={panelDescriptor ? [panelDescriptor] : []} />
    </EuiPopover>
  );
};
