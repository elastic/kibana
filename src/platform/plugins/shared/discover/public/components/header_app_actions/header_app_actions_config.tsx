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
  EuiButtonIcon,
  EuiContextMenu,
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

const ALERTS_PANEL_ID = 1;
const EXPORT_PANEL_ID = 2;

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

const primaryButtonCss = css`
  block-size: 28px;
`;

const OverflowKeyPadSection: React.FC = () => (
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

const saveOverflowMenuCss = css`
  width: 160px;
`;

const DiscoverSaveButton: React.FC = () => {
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
        css={primaryButtonCss}
        iconType="save"
        data-test-subj="headerGlobalNav-appActionsSaveButton"
        minWidth={false}
      >
        Save
      </EuiSplitButton.ActionPrimary>
      <EuiPopover
        button={React.cloneElement(
          <EuiSplitButton.ActionSecondary
            css={primaryButtonCss}
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

/**
 * POC: Static header app actions config for Discover (overflow + New, Share, Save).
 * Same pattern as setHelpExtension: set when app mounts; cleared on app change.
 */
export function getDiscoverHeaderAppActionsConfig(): ChromeHeaderAppActionsConfig {
  return {
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          { renderItem: () => <OverflowKeyPadSection />, key: 'keypad' },
          { name: 'Open', icon: 'folderOpen', onClick: noop },
          { name: 'Inspect', icon: 'inspect', onClick: noop },
          { name: 'Data sets', icon: 'indexOpen', onClick: noop },
          { name: 'Background searches', icon: 'backgroundTask', onClick: noop },
          { isSeparator: true as const, key: 'sep2' },
          { name: 'Alerts', icon: 'bell', onClick: noop, panel: ALERTS_PANEL_ID },
          { name: 'Export', icon: 'exportAction', onClick: noop, panel: EXPORT_PANEL_ID },
          { isSeparator: true as const, key: 'sep3' },
          { name: 'Rename', icon: 'pencil', onClick: noop },
          { name: 'Settings', icon: 'gear', onClick: noop },
          { isSeparator: true as const, key: 'sep4' },
          { name: 'Docs', icon: 'documentation', onClick: noop },
          { name: 'Feedback', icon: 'editorComment', onClick: noop },
        ],
      },
      {
        id: ALERTS_PANEL_ID,
        title: 'Alerts',
        items: [
          { name: 'Create search threshold rule', icon: 'bell', onClick: noop },
          { name: 'Manage rules and connectors', icon: 'document', onClick: noop },
        ],
      },
      {
        id: EXPORT_PANEL_ID,
        title: 'Export',
        items: [
          { name: 'CSV', icon: 'calendar', onClick: noop },
          { name: 'Schedule export', icon: 'calendar', onClick: noop },
        ],
      },
    ],
    primaryActions: [
      <EuiButtonIcon
        key="new"
        size="xs"
        color="text"
        iconType="plusInCircle"
        data-test-subj="headerGlobalNav-appActionsNewButton"
      >
        New
      </EuiButtonIcon>,
      <EuiButtonIcon
        key="share"
        size="xs"
        color="text"
        iconType="share"
        data-test-subj="headerGlobalNav-appActionsShareButton"
      >
        Share
      </EuiButtonIcon>,
      <DiscoverSaveButton key="save" />,
    ],
  };
}
