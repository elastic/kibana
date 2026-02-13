/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiPopover,
  EuiSplitButton,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

const noop = () => {};

const EXPORT_PANEL_ID = 1;

/** Synced from DashboardPrimaryActions so overflow menu can hide "Reset changes" in edit mode. */
let dashboardHeaderIsEditMode = false;

const overflowKeyPadCss = css`
  justify-content: center;
  padding-block: 8px;
`;

const overflowKeyPadItemCss = css`
  width: 72px;
  height: 64px;
  min-width: 72px;
  min-height: 48px;
`;

const saveOverflowMenuCss = css`
  width: 160px;
`;

const DashboardSaveSplitButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const panels = [
    {
      id: 0,
      title: '',
      items: [
        { name: 'Save as', icon: 'save', onClick: () => setIsOpen(false) },
        { name: 'Reset changes', icon: 'editorUndo', onClick: () => setIsOpen(false) },
      ],
    },
  ];
  return (
    <EuiSplitButton
      size="s"
      color="text"
      fill={false}
      data-test-subj="headerGlobalNav-appActionsSaveSplitButton"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.saveAriaLabel', {
        defaultMessage: 'Save',
      })}
    >
      <EuiSplitButton.ActionPrimary
        iconType="save"
        data-test-subj="headerGlobalNav-appActionsSaveButton"
        minWidth={false}
      >
        {i18n.translate('core.ui.chrome.headerGlobalNav.saveButton', {
          defaultMessage: 'Save',
        })}
      </EuiSplitButton.ActionPrimary>
      <EuiPopover
        button={React.cloneElement(
          <EuiSplitButton.ActionSecondary
            iconType="arrowDown"
            aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.saveOptionsAriaLabel', {
              defaultMessage: 'Save options',
            })}
            data-test-subj="headerGlobalNav-appActionsSaveDropdown"
          />,
          { onClick: () => setIsOpen(true) }
        )}
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        anchorPosition="downLeft"
        panelPaddingSize="none"
      >
        <EuiContextMenu css={saveOverflowMenuCss} panels={panels} initialPanelId={0} />
      </EuiPopover>
    </EuiSplitButton>
  );
};

const DashboardPrimaryActions: React.FC = () => {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <>
      <EuiButtonIcon
        size="xs"
        color="text"
        iconType="share"
        onClick={noop}
        data-test-subj="headerGlobalNav-appActionsShareButton"
      >
        Share
      </EuiButtonIcon>
      {!isEditMode && (
        <EuiButtonIcon
          size="xs"
          color="text"
          iconType="fullScreen"
          onClick={noop}
          data-test-subj="headerGlobalNav-appActionsFullScreenButton"
          aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.fullScreenAriaLabel', {
            defaultMessage: 'Full screen',
          })}
        />
      )}
      {isEditMode ? (
        <>
          <EuiButtonIcon
            size="xs"
            color="text"
            iconType="logOut"
            onClick={() => {
              dashboardHeaderIsEditMode = false;
              setIsEditMode(false);
            }}
            data-test-subj="headerGlobalNav-appActionsExitEditButton"
            aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.exitEditAriaLabel', {
              defaultMessage: 'Exit edit',
            })}
          />
          <DashboardSaveSplitButton />
          <EuiButton
            size="s"
            color="success"
            minWidth={false}
            iconType="plusInCircle"
            onClick={noop}
            data-test-subj="headerGlobalNav-appActionsAddButton"
            aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.addAriaLabel', {
              defaultMessage: 'Add',
            })}
          >
            {i18n.translate('core.ui.chrome.headerGlobalNav.addButton', {
              defaultMessage: 'Add',
            })}
          </EuiButton>
        </>
      ) : (
        <EuiButton
          size="s"
          color="text"
          fill={false}
          iconType="pencil"
          onClick={() => {
            dashboardHeaderIsEditMode = true;
            setIsEditMode(true);
          }}
          data-test-subj="headerGlobalNav-appActionsEditButton"
          aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.editAriaLabel', {
            defaultMessage: 'Edit',
          })}
        >
          {i18n.translate('core.ui.chrome.headerGlobalNav.editButton', {
            defaultMessage: 'Edit',
          })}
        </EuiButton>
      )}
    </>
  );
};

const DashboardOverflowKeyPadSection: React.FC = () => (
  <>
    <EuiKeyPadMenu css={overflowKeyPadCss}>
      <EuiKeyPadMenuItem
        label="New"
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowNew"
      >
        <EuiIcon type="plusInCircle" size="m" />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        label="Favorite"
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowFavorite"
      >
        <EuiIcon type="star" size="m" />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        label="Share"
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowShare"
      >
        <EuiIcon type="share" size="m" />
      </EuiKeyPadMenuItem>
    </EuiKeyPadMenu>
    <EuiHorizontalRule margin="none" />
  </>
);

/**
 * Header app actions config for the Dashboards app (overflow + Full screen, Share, Edit).
 * Same pattern as Discover: set when app mounts; cleared on app change.
 */
export function getDashboardHeaderAppActionsConfig(): ChromeHeaderAppActionsConfig {
  return {
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          { renderItem: () => <DashboardOverflowKeyPadSection />, key: 'keypad' },
          { name: 'Open', icon: 'folderOpen', onClick: noop },
          { name: 'Full screen', icon: 'fullScreen', onClick: noop },
          {
            renderItem: () =>
              dashboardHeaderIsEditMode ? null : (
                <EuiContextMenuItem icon="copy" onClick={noop} size="s">
                  {i18n.translate('core.ui.chrome.headerGlobalNav.duplicate', {
                    defaultMessage: 'Duplicate',
                  })}
                </EuiContextMenuItem>
              ),
            key: 'duplicate',
          },
          {
            renderItem: () =>
              dashboardHeaderIsEditMode ? null : (
                <EuiContextMenuItem icon="editorUndo" onClick={noop} size="s">
                  {i18n.translate('core.ui.chrome.headerGlobalNav.resetChanges', {
                    defaultMessage: 'Reset changes',
                  })}
                </EuiContextMenuItem>
              ),
            key: 'reset-changes',
          },
          { name: 'Background searches', icon: 'backgroundTask', onClick: noop },
          { name: 'Export', icon: 'exportAction', onClick: noop, panel: EXPORT_PANEL_ID },
          { isSeparator: true as const, key: 'sep1' },
          { name: 'Rename', icon: 'pencil', onClick: noop },
          { name: 'Settings', icon: 'gear', onClick: noop },
        ],
      },
      {
        id: EXPORT_PANEL_ID,
        title: 'Export',
        items: [
          { name: 'PDF reports', icon: 'document', onClick: noop },
          { name: 'PNG reports', icon: 'image', onClick: noop },
          { isSeparator: true as const, key: 'exportSep' },
          { name: 'Schedule export', icon: 'calendar', onClick: noop },
        ],
      },
    ],
    primaryActions: [<DashboardPrimaryActions key="dashboard-primary-actions" />],
  };
}
