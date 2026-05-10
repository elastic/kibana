/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
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
import { LayoutOverlay } from './overlay/layout_overlay';
import { getDefaultLayoutConfig, type LayoutConfig } from '../../lib';
import { LayoutSettingsPanel } from './settings/layout_settings_panel';
import { EditOverlay } from '../edit/edit_overlay';
import type { EditOverlayHandle } from '../edit/edit_overlay';
import { DEVTOOL_IGNORE_ATTR, LAYOUT_SETTINGS_FLYOUT_ID } from '../../lib/constants';

/**
 * Toggles a column layout overlay and provides layout settings.
 */
export const LayoutButton = () => {
  const { euiTheme } = useEuiTheme();
  const [isLayoutVisible, setIsLayoutVisible] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() =>
    getDefaultLayoutConfig(parseInt(euiTheme.size.base, 10))
  );
  const editHandleRef = useRef<EditOverlayHandle>(null);
  const defaultLayoutConfig = getDefaultLayoutConfig(parseInt(euiTheme.size.base, 10));

  // Raise the flyout's EuiPortal z-index above the layout overlay (toast + 2)
  // so the settings panel isn't visually covered by the overlay stripes.
  // Uses useEffect + requestAnimationFrame because the flyout renders in its
  // own portal, so the DOM element doesn't exist during useLayoutEffect.
  useEffect(() => {
    if (!isFlyoutOpen) return;
    const zIndex = String(Number(euiTheme.levels.toast) + 5);

    const rafId = requestAnimationFrame(() => {
      const flyoutEl = document.getElementById(LAYOUT_SETTINGS_FLYOUT_ID);
      const portalParent = flyoutEl?.closest('[data-euiportal="true"]');

      if (portalParent instanceof HTMLElement) {
        portalParent.style.zIndex = zIndex;
      }
      if (flyoutEl instanceof HTMLElement) {
        flyoutEl.style.zIndex = zIndex;
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [isFlyoutOpen, euiTheme.levels.toast]);

  const preventTargetFromLosingFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  const handleToggleLayout = () => {
    setIsLayoutVisible((prev) => !prev);
    setIsPopoverOpen(false);
  };

  const handleOpenSettings = () => {
    setIsPopoverOpen(false);
    setIsFlyoutOpen(true);
  };

  const handleToggleEditMode = () => {
    setIsEditMode((prev) => !prev);
    setIsPopoverOpen(false);
  };

  const handleResetEdits = () => {
    editHandleRef.current?.resetAll();
    setMoveCount(0);
    setIsPopoverOpen(false);
  };

  const contextMenuPanels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      width: 160,
      items: [
        {
          name: isLayoutVisible
            ? i18n.translate('kbnDesignTools.layoutButton.layout.hideLabel', {
                defaultMessage: 'Hide layout',
              })
            : i18n.translate('kbnDesignTools.layoutButton.layout.showLabel', {
                defaultMessage: 'Show layout',
              }),
          icon: isLayoutVisible ? 'eyeClosed' : 'eye',
          onClick: handleToggleLayout,
        },
        {
          name: i18n.translate('kbnDesignTools.layoutButton.layout.settingsLabel', {
            defaultMessage: 'Layout settings',
          }),
          icon: 'controlsHorizontal',
          onClick: handleOpenSettings,
        },
        {
          isSeparator: true,
        },
        {
          name: isEditMode
            ? i18n.translate('kbnDesignTools.layoutButton.editMode.exitLabel', {
                defaultMessage: 'Exit edit',
              })
            : i18n.translate('kbnDesignTools.layoutButton.editMode.startLabel', {
                defaultMessage: 'Edit',
              }),
          icon: isEditMode ? 'logOut' : 'pencil',
          onClick: handleToggleEditMode,
          toolTipContent: i18n.translate('kbnDesignTools.layoutButton.editMode.buttonTooltip', {
            defaultMessage:
              'Snapping is enabled while layout is active. Hold Shift to move freely.',
          }),
        },
        {
          name: i18n.translate('kbnDesignTools.layoutButton.editMode.resetButtonLabel', {
            defaultMessage: 'Reset edits',
          }),
          icon: 'undo',
          onClick: handleResetEdits,
          disabled: moveCount === 0,
        },
      ],
    },
  ];

  return (
    <>
      <EuiPopover
        panelProps={{ [DEVTOOL_IGNORE_ATTR]: true } as Record<string, unknown>}
        button={
          <EuiToolTip
            content={
              isPopoverOpen
                ? ''
                : i18n.translate('kbnDesignTools.layoutButton.tooltip', {
                    defaultMessage: 'Layout overlay',
                  })
            }
            position="bottom"
          >
            <EuiButtonIcon
              onClick={() => {
                setIsPopoverOpen((prev) => !prev);
                setIsFlyoutOpen(false);
              }}
              onMouseDown={preventTargetFromLosingFocus}
              iconType="grid"
              isSelected={isLayoutVisible}
              aria-pressed={isLayoutVisible}
              aria-label={i18n.translate('kbnDesignTools.layoutButton.ariaLabel', {
                defaultMessage: 'Layout overlay',
              })}
              color="text"
              data-test-subj="layoutOverlayButton"
            />
          </EuiToolTip>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        anchorPosition="upRight"
        panelPaddingSize="none"
        aria-label={i18n.translate('kbnDesignTools.layoutButton.toggleLabel', {
          defaultMessage: 'Toggle layout',
        })}
      >
        <EuiContextMenu initialPanelId={0} panels={contextMenuPanels} size="s" />
      </EuiPopover>
      {isFlyoutOpen && (
        <EuiFlyout
          id={LAYOUT_SETTINGS_FLYOUT_ID}
          onClose={() => setIsFlyoutOpen(false)}
          size="s"
          ownFocus={false}
          aria-labelledby="layoutSettingsFlyoutTitle"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id="layoutSettingsFlyoutTitle">
                {i18n.translate('kbnDesignTools.layoutButton.settingsLabel', {
                  defaultMessage: 'Layout settings',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <LayoutSettingsPanel
              config={layoutConfig}
              defaultConfig={defaultLayoutConfig}
              setConfig={setLayoutConfig}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
      {isLayoutVisible && <LayoutOverlay layoutConfig={layoutConfig} />}
      {(isEditMode || moveCount > 0) && (
        <EditOverlay
          layoutConfig={layoutConfig}
          isLayoutVisible={isLayoutVisible}
          isActive={isEditMode}
          setIsEditMode={setIsEditMode}
          onChangeCount={setMoveCount}
          handleRef={editHandleRef}
        />
      )}
    </>
  );
};
