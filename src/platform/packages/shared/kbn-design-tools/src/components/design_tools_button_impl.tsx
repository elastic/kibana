/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { flushSync } from 'react-dom';
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
import { LayoutOverlay } from './layout/overlay/layout_overlay';
import { getDefaultLayoutConfig, type LayoutConfig } from '../lib/layout/layout_config';
import { LayoutSettingsPanel } from './layout/settings/layout_settings_panel';
import { EditOverlay } from './edit/edit_overlay';
import type { EditOverlayHandle } from './edit/edit_overlay';
import {
  ADD_EUI_PANEL_ID,
  DEVTOOL_IGNORE_ATTR,
  LAYOUT_POPOVER_ID,
  LAYOUT_SETTINGS_FLYOUT_ID,
} from '../lib/constants';
import { useOverlayZIndex } from '../hooks/use_overlay_z_index';
import { usePortalZIndex } from '../hooks/use_portal_z_index';
import { buildAddEuiPanels } from './edit/library/build_add_eui_panels';
import { renderEuiComponentLive, centerInViewport } from './edit/library/insert_element';
import { DEVTOOL_LIBRARY_ID_ATTR } from '../lib/constants';
import { preloadAllEuiIcons } from './edit/library/eui_icon_cache';
import { pickJsonFile } from '../lib/history/serialization/session_io';
import { ContextMenuSkeleton } from './context_menu_skeleton';

/**
 * Toggles a column layout overlay and provides layout settings.
 */
export const DesignToolsButtonImpl = ({ initiallyOpen }: { initiallyOpen?: boolean }) => {
  const { euiTheme } = useEuiTheme();
  const [isLayoutVisible, setIsLayoutVisible] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(initiallyOpen ?? false);
  const [iconsReady, setIconsReady] = useState(false);
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

  useEffect(() => {
    if (initiallyOpen) {
      preloadAllEuiIcons().finally(() => setIconsReady(true));
    }
  }, [initiallyOpen]);

  const handleEuiSearchChange = useCallback((panelId: string, value: string) => {
    setEuiSearchTerms((prev) => ({ ...prev, [panelId]: value }));
  }, []);

  const preventTargetFromLosingFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const handleToggleLayout = () => {
    setIsLayoutVisible((prev) => !prev);
    closePopover();
  };

  const handleOpenSettings = () => {
    closePopover();
    setIsFlyoutOpen(true);
  };

  const handleToggleEditMode = () => {
    setIsEditMode((prev) => !prev);
    closePopover();
  };

  const handleResetEdits = () => {
    editHandleRef.current?.resetAll();
    setMoveCount(0);
    closePopover();
  };

  const handleExport = () => {
    editHandleRef.current?.exportSessions();
    closePopover();
  };

  const handleImport = async () => {
    const file = await pickJsonFile();
    if (!file) return;

    // Force a synchronous render so EditOverlay mounts and populates
    // editHandleRef before we call importSessions. Without flushSync
    // the async context causes React to defer the commit, leaving the
    // ref null when we read it.
    flushSync(() => {
      closePopover();
      setIsEditMode(true);
    });

    const result = await editHandleRef.current?.importSessions(file);
    if (result && (result.restoredCount > 0 || result.deletedCount > 0)) {
      setMoveCount((prev) => prev + result.restoredCount + result.deletedCount);
    }
  };

  const handleInsertEui = useCallback(
    async (element: ReactElement, libraryId?: string) => {
      closePopover();
      await preloadAllEuiIcons();

      const live = await renderEuiComponentLive(element, zIndex.clone);
      const el = live.wrapper;

      if (libraryId) {
        el.setAttribute(DEVTOOL_LIBRARY_ID_ATTR, libraryId);
      }

      centerInViewport(el, live.rect);
      el.style.pointerEvents = 'auto';

      // Force a synchronous render so EditOverlay mounts and populates
      // editHandleRef before we call insertElement. Without flushSync
      // the async context causes React to defer the commit, leaving the
      // ref null when we read it.
      flushSync(() => {
        setIsEditMode(true);
        setMoveCount((prev) => prev + 1);
      });

      editHandleRef.current?.insertElement(el, live.liveReactElement, live.cleanup);
    },
    [closePopover, zIndex.clone]
  );

  const addEuiPanels = buildAddEuiPanels({
    onInsert: handleInsertEui,
    searchTerms: euiSearchTerms,
    onSearchChange: handleEuiSearchChange,
  });

  const contextMenuPanels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      width: 180,
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
          'data-test-subj': 'designToolsToggleLayout',
        },
        {
          name: i18n.translate('kbnDesignTools.layout.popover.layoutSettingsLabel', {
            defaultMessage: 'Layout settings',
          }),
          icon: 'controlsHorizontal',
          onClick: handleOpenSettings,
          'data-test-subj': 'designToolsLayoutSettings',
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
        {
          isSeparator: true,
        },
        {
          name: i18n.translate('kbnDesignTools.layout.popover.exportLabel', {
            defaultMessage: 'Export',
          }),
          icon: 'exportAction',
          onClick: handleExport,
          disabled: moveCount === 0,
        },
        {
          name: i18n.translate('kbnDesignTools.layout.popover.importLabel', {
            defaultMessage: 'Import',
          }),
          icon: 'importAction',
          onClick: handleImport,
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
                : i18n.translate('kbnDesignTools.layout.button.tooltip', {
                    defaultMessage: 'Design tools',
                  })
            }
            position="bottom"
          >
            <EuiButtonIcon
              onClick={() => {
                preloadAllEuiIcons().finally(() => setIconsReady(true));
                setIsPopoverOpen((prev) => !prev);
                setIsFlyoutOpen(false);
              }}
              onMouseDown={preventTargetFromLosingFocus}
              iconType="vectorSquare"
              isSelected={isLayoutVisible}
              aria-pressed={isLayoutVisible}
              aria-label={i18n.translate('kbnDesignTools.layout.button.ariaLabel', {
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
        {iconsReady ? (
          <EuiContextMenu initialPanelId={0} panels={contextMenuPanels} />
        ) : (
          <ContextMenuSkeleton />
        )}
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
