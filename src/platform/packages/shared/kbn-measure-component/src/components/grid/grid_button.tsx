/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { MouseEvent } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPopover,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GridOverlay, getDefaultGridConfig } from './grid_overlay';
import type { GridConfig } from './grid_overlay';
import { GridSettingsPanel } from './grid_settings_panel';
import { MoveOverlay } from './move_overlay';
import { GRID_SETTINGS_FLYOUT_ID } from '../../lib/constants';

/**
 * Toggles a column grid overlay and provides grid settings.
 */
export const GridButton = () => {
  const { euiTheme } = useEuiTheme();
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [gridConfig, setGridConfig] = useState<GridConfig>(() =>
    getDefaultGridConfig(parseInt(euiTheme.size.base, 10))
  );
  const defaultGridConfig = getDefaultGridConfig(parseInt(euiTheme.size.base, 10));

  const preventTargetFromLosingFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  const handleToggleGrid = () => {
    setIsGridVisible((prev) => !prev);
    setIsPopoverOpen(false);
  };

  const handleOpenSettings = () => {
    setIsPopoverOpen(false);
    setIsFlyoutOpen(true);
  };

  const handleToggleMoveMode = () => {
    setIsMoveMode((prev) => !prev);
    setIsPopoverOpen(false);
  };

  const contextMenuPanels = [
    {
      id: 0,
      width: 140,
      items: [
        {
          name: i18n.translate('kbnMeasureComponent.gridButton.toggleLabel', {
            defaultMessage: 'Toggle grid',
          }),
          icon: isGridVisible ? 'eyeClosed' : 'eye',
          onClick: handleToggleGrid,
        },
        {
          name: i18n.translate('kbnMeasureComponent.gridButton.settingsLabel', {
            defaultMessage: 'Grid settings',
          }),
          icon: 'controlsHorizontal',
          onClick: handleOpenSettings,
        },
        {
          name: i18n.translate('kbnMeasureComponent.gridButton.moveModeLabel', {
            defaultMessage: 'Move mode',
          }),
          icon: isMoveMode ? 'lock' : 'move',
          onClick: handleToggleMoveMode,
        },
      ],
    },
  ];

  return (
    <>
      <EuiPopover
        panelProps={{ 'data-devtool-ignore': true } as Record<string, unknown>}
        button={
          <EuiToolTip
            content={
              isPopoverOpen
                ? ''
                : i18n.translate('kbnMeasureComponent.gridButton.tooltip', {
                    defaultMessage: 'Column grid',
                  })
            }
            position="bottom"
          >
            <EuiButtonIcon
              onClick={() => setIsPopoverOpen((prev) => !prev)}
              onMouseDown={preventTargetFromLosingFocus}
              iconType="grid"
              isSelected={isGridVisible}
              aria-pressed={isGridVisible}
              aria-label={i18n.translate('kbnMeasureComponent.gridButton.ariaLabel', {
                defaultMessage: 'Column grid',
              })}
              color="text"
              data-test-subj="gridOverlayButton"
            />
          </EuiToolTip>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        anchorPosition="upRight"
        panelPaddingSize="none"
        aria-label={i18n.translate('kbnMeasureComponent.gridButton.toggleLabel', {
          defaultMessage: 'Toggle grid',
        })}
      >
        <EuiContextMenu initialPanelId={0} panels={contextMenuPanels} size="s" />
      </EuiPopover>
      {isFlyoutOpen && (
        <EuiFlyout
          id={GRID_SETTINGS_FLYOUT_ID}
          onClose={() => setIsFlyoutOpen(false)}
          size="s"
          ownFocus={false}
          aria-labelledby="gridSettingsFlyoutTitle"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id="gridSettingsFlyoutTitle">
                {i18n.translate('kbnMeasureComponent.gridButton.settingsLabel', {
                  defaultMessage: 'Grid settings',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <GridSettingsPanel
              config={gridConfig}
              defaultConfig={defaultGridConfig}
              setConfig={setGridConfig}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
      {isGridVisible && <GridOverlay config={gridConfig} />}
      {isMoveMode && <MoveOverlay setIsMoveMode={setIsMoveMode} />}
    </>
  );
};
