/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
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

/** Shared edit mode state so overflow menu and secondary/primary actions stay in sync. */
let dashboardHeaderIsEditMode = false;
const editModeListeners: Array<(value: boolean) => void> = [];
const setDashboardHeaderIsEditMode = (value: boolean) => {
  dashboardHeaderIsEditMode = value;
  editModeListeners.forEach((listener) => listener(value));
};
const useDashboardHeaderEditMode = (): [boolean, (value: boolean) => void] => {
  const [isEditMode, setIsEditMode] = useState(dashboardHeaderIsEditMode);
  useEffect(() => {
    editModeListeners.push(setIsEditMode);
    return () => {
      const index = editModeListeners.indexOf(setIsEditMode);
      if (index !== -1) editModeListeners.splice(index, 1);
    };
  }, []);
  return [isEditMode, setDashboardHeaderIsEditMode];
};

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

const primaryButtonCss = css`
  block-size: 28px;
`;

const DashboardSaveSplitButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const primaryActionButtonCss = css`
    background-color: transparent !important;
    height: 28px !important;
    margin-left: 0;
  `;
  const secondaryActionButtonCss = css`
    background-color: transparent !important;
    height: 28px !important;
    margin-left: 0;
  `;

  const saveTextButtonCss = css`
    height: 28px !important;
    min-height: 28px !important;
  `;

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
    <EuiButtonEmpty
      css={saveTextButtonCss}
      size="s"
      color="text"
      iconType="save"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.saveAriaLabel', {
        defaultMessage: 'Save',
      })}
      data-test-subj="headerGlobalNav-appActionsSaveIconButton"
    >
      {i18n.translate('core.ui.chrome.headerGlobalNav.saveAriaLabel', {
        defaultMessage: 'Save',
      })}
    </EuiButtonEmpty>
    // <EuiSplitButton
    //   css={primaryActionButtonCss}
    //   size="s"
    //   color="text"
    //   fill={false}
    //   data-test-subj="headerGlobalNav-appActionsSaveSplitButton"
    //   aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.saveAriaLabel', {
    //     defaultMessage: 'Save',
    //   })}
    // >
    //   <EuiSplitButton.ActionPrimary
    //     css={primaryActionButtonCss}
    //     iconType="save"
    //     data-test-subj="headerGlobalNav-appActionsSaveButton"
    //     minWidth={false}
    //   >
    //     {i18n.translate('core.ui.chrome.headerGlobalNav.saveButton', {
    //       defaultMessage: 'Save',
    //     })}
    //   </EuiSplitButton.ActionPrimary>
    //   <EuiPopover
    //     button={React.cloneElement(
    //       <EuiSplitButton.ActionSecondary
    //         css={secondaryActionButtonCss}
    //         iconType="arrowDown"
    //         aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.saveOptionsAriaLabel', {
    //           defaultMessage: 'Save options',
    //         })}
    //         data-test-subj="headerGlobalNav-appActionsSaveDropdown"
    //       />,
    //       { onClick: () => setIsOpen(true) }
    //     )}
    //     isOpen={isOpen}
    //     closePopover={() => setIsOpen(false)}
    //     anchorPosition="downLeft"
    //     panelPaddingSize="none"
    //   >
    //     <EuiContextMenu css={saveOverflowMenuCss} panels={panels} initialPanelId={0} />
    //   </EuiPopover>
    // </EuiSplitButton>
  );
};

const DashboardSecondaryActions: React.FC = () => {
  const [isEditMode, setEditMode] = useDashboardHeaderEditMode();
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
      {isEditMode && (
        <EuiButtonIcon
          size="xs"
          color="text"
          iconType="logOut"
          onClick={() => setEditMode(false)}
          data-test-subj="headerGlobalNav-appActionsExitEditButton"
          aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.exitEditAriaLabel', {
            defaultMessage: 'Exit edit',
          })}
        />
      )}
    </>
  );
};

const DashboardPrimaryActions: React.FC = () => {
  const [isEditMode, setEditMode] = useDashboardHeaderEditMode();
  const primaryActionButtonCss = css`
    background-color: transparent !important;
    height: 28px !important;
    margin-left: 0;
  `;

  if (isEditMode) {
    return (
      <>
        <DashboardSaveSplitButton />
        <EuiButton
          css={primaryButtonCss}
          size="s"
          color="primary"
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
    );
  }
  return (
    <EuiButtonEmpty
      css={primaryActionButtonCss}
      size="s"
      color="text"
      fill={false}
      minWidth={false}
      iconType="pencil"
      onClick={() => setEditMode(true)}
      data-test-subj="headerGlobalNav-appActionsEditButton"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.editAriaLabel', {
        defaultMessage: 'Edit',
      })}
    >
      {i18n.translate('core.ui.chrome.headerGlobalNav.editButton', {
        defaultMessage: 'Edit',
      })}
    </EuiButtonEmpty>
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
 * Header app actions config for the Dashboards listing page: icon-only "New" button (secondary).
 */
export function getDashboardListingHeaderAppActionsConfig(
  onCreateDashboard: () => void
): ChromeHeaderAppActionsConfig {
  const primaryActionButtonCss = css`
    background-color: transparent !important;
    height: 28px !important;
    min-width: 28px !important;
    margin-left: 0;
`;
  return {
    primaryActions: [
      <EuiButtonIcon
        key="listing-new-dashboard"
        css={primaryActionButtonCss}
        size="xs"
        color="text"
        iconType="plusInCircle"
        iconSize="m"
        onClick={onCreateDashboard}
        data-test-subj="headerGlobalNav-appActionsNewDashboardButton"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.newAriaLabel', {
          defaultMessage: 'New',
        })}
      />
    ],
  };
}

/**
 * Header app actions config for the Dashboards app (secondary: Share, Full screen, Exit; overflow; primary: Edit or Save+Add).
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
    secondaryActions: [<DashboardSecondaryActions key="dashboard-secondary-actions" />],
    primaryActions: [<DashboardPrimaryActions key="dashboard-primary-actions" />],
  };
}
