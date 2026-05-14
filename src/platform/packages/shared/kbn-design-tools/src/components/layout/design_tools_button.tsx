/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
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
import { getDefaultLayoutConfig, type LayoutConfig } from '../../lib/layout/layout_config';
import { LayoutSettingsPanel } from './settings/layout_settings_panel';
import { EditOverlay } from '../edit/edit_overlay';
import type { EditOverlayHandle } from '../edit/edit_overlay';
import {
  ADD_EUI_PANEL_ID,
  DEVTOOL_IGNORE_ATTR,
  LAYOUT_POPOVER_ID,
  LAYOUT_SETTINGS_FLYOUT_ID,
} from '../../lib/constants';
import { useOverlayZIndex, usePortalZIndex } from '../../hooks';
import { buildAddEuiPanels } from '../edit/library';
import {
  renderAndCloneEuiComponent,
  renderEuiComponentLive,
  centerInViewport,
} from '../../lib/dom/insert_element';
import { preloadAllEuiIcons } from '../../lib/eui_icon_cache';

/**
 * Toggles a column layout overlay and provides layout settings.
 */
export const DesignToolsButton = () => {
  const { euiTheme } = useEuiTheme();
  const [isLayoutVisible, setIsLayoutVisible] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [euiSearchTerms, setEuiSearchTerms] = useState<Record<string, string>>({});
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() =>
    getDefaultLayoutConfig(parseInt(euiTheme.size.base, 10))
  );
  const editHandleRef = useRef<EditOverlayHandle>(null);
  const defaultLayoutConfig = getDefaultLayoutConfig(parseInt(euiTheme.size.base, 10));
  const zIndex = useOverlayZIndex();

  usePortalZIndex(LAYOUT_SETTINGS_FLYOUT_ID, zIndex.flyout, isFlyoutOpen);
  usePortalZIndex(LAYOUT_POPOVER_ID, zIndex.popover, isPopoverOpen);

  const handleEuiSearchChange = useCallback((panelId: string, value: string) => {
    setEuiSearchTerms((prev) => ({ ...prev, [panelId]: value }));
  }, []);

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

  const handleInsertEui = useCallback(
    async (element: ReactElement, interactive?: boolean) => {
      setIsPopoverOpen(false);
      await preloadAllEuiIcons();

      let el: HTMLElement;
      let rect: DOMRect;
      let liveReactElement: { element: ReactElement; zIndex: number } | undefined;

      if (interactive) {
        const live = renderEuiComponentLive(element, zIndex.clone);
        el = live.wrapper;
        rect = live.rect;
        liveReactElement = live.liveReactElement;
      } else {
        const cloned = await renderAndCloneEuiComponent(element, zIndex.clone);
        el = cloned.clone;
        rect = cloned.rect;
      }

      centerInViewport(el, rect);
      el.style.pointerEvents = 'auto';
      if (!interactive) {
        document.body.appendChild(el);
      }
      setIsEditMode(true);
      setMoveCount((prev) => prev + 1);

      // Defer insertElement until after React renders EditOverlay.
      // The state updates above are batched, so editHandleRef.current
      // is null until the next commit.
      requestAnimationFrame(() => {
        editHandleRef.current?.insertElement(el, liveReactElement);
      });
    },
    [zIndex.clone]
  );

  const addEuiPanels = buildAddEuiPanels({
    onInsert: handleInsertEui,
    searchTerms: euiSearchTerms,
    onSearchChange: handleEuiSearchChange,
  });

  const contextMenuPanels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      width: 160,
      items: [
        {
          name: isLayoutVisible
            ? i18n.translate('kbnDesignTools.layout.popover.layoutHideLabel', {
                defaultMessage: 'Hide layout',
              })
            : i18n.translate('kbnDesignTools.layout.popover.layoutShowLabel', {
                defaultMessage: 'Show layout',
              }),
          icon: isLayoutVisible ? 'eyeClosed' : 'eye',
          onClick: handleToggleLayout,
        },
        {
          name: i18n.translate('kbnDesignTools.layout.popover.layoutSettingsLabel', {
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
            ? i18n.translate('kbnDesignTools.layout.popover.editMode.exitLabel', {
                defaultMessage: 'Exit edit',
              })
            : i18n.translate('kbnDesignTools.layout.popover.editMode.startLabel', {
                defaultMessage: 'Edit',
              }),
          icon: isEditMode ? 'logOut' : 'pencil',
          onClick: handleToggleEditMode,
          toolTipContent: i18n.translate('kbnDesignTools.layout.popover.editMode.buttonTooltip', {
            defaultMessage:
              'Snapping is enabled while layout is active. Hold Shift to move freely.',
          }),
        },
        {
          name: i18n.translate('kbnDesignTools.layout.popover.editMode.resetButtonLabel', {
            defaultMessage: 'Reset edits',
          }),
          icon: 'undo',
          onClick: handleResetEdits,
          disabled: moveCount === 0,
        },
        {
          isSeparator: true,
        },
        {
          name: i18n.translate('kbnDesignTools.layout.popover.addEuiLabel', {
            defaultMessage: 'Add from EUI',
          }),
          icon: 'plusInCircle',
          panel: ADD_EUI_PANEL_ID,
        },
      ],
    },
    ...addEuiPanels,
  ];

  return (
    <>
      <EuiPopover
        panelProps={
          { id: LAYOUT_POPOVER_ID, [DEVTOOL_IGNORE_ATTR]: true } as Record<string, unknown>
        }
        button={
          <EuiToolTip
            content={
              isPopoverOpen
                ? ''
                : i18n.translate('kbnDesignTools.designToolsButton.tooltip', {
                    defaultMessage: 'Design tools',
                  })
            }
            position="bottom"
          >
            <EuiButtonIcon
              onClick={() => {
                preloadAllEuiIcons();
                setIsPopoverOpen((prev) => !prev);
                setIsFlyoutOpen(false);
              }}
              onMouseDown={preventTargetFromLosingFocus}
              iconType="vectorSquare"
              isSelected={isLayoutVisible}
              aria-pressed={isLayoutVisible}
              aria-label={i18n.translate('kbnDesignTools.designToolsButton.ariaLabel', {
                defaultMessage: 'Design tools',
              })}
              color="text"
              data-test-subj="designToolsButton"
            />
          </EuiToolTip>
        }
        isOpen={isPopoverOpen}
        closePopover={() => {
          setIsPopoverOpen(false);
          setEuiSearchTerms({});
        }}
        anchorPosition="upRight"
        panelPaddingSize="none"
        aria-label={i18n.translate('kbnDesignTools.layout.toggle.label', {
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
                {i18n.translate('kbnDesignTools.layout.settings.flyoutTitle', {
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
