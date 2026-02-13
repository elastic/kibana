/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

const noop = () => {};

const EXPORT_PANEL_ID = 1;

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
          { name: 'Duplicate', icon: 'copy', onClick: noop },
          { name: 'Reset changes', icon: 'editorUndo', onClick: noop },
          { name: 'Background searches', icon: 'backgroundTask', onClick: noop },
          { name: 'Export', icon: 'exportAction', onClick: noop, panel: EXPORT_PANEL_ID },
          { isSeparator: true as const, key: 'sep1' },
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
    primaryActions: [
      <EuiButtonIcon
        key="fullscreen"
        size="xs"
        color="text"
        iconType="fullScreen"
        onClick={noop}
        data-test-subj="headerGlobalNav-appActionsFullScreenButton"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.fullScreenAriaLabel', {
          defaultMessage: 'Full screen',
        })}
      />,
      <EuiButtonIcon
        key="share"
        size="xs"
        color="text"
        iconType="share"
        onClick={noop}
        data-test-subj="headerGlobalNav-appActionsShareButton"
      >
        Share
      </EuiButtonIcon>,
      <EuiButton
        key="edit"
        size="s"
        color="text"
        fill={false}
        iconType="pencil"
        onClick={noop}
        data-test-subj="headerGlobalNav-appActionsEditButton"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.editAriaLabel', {
          defaultMessage: 'Edit',
        })}
      >
        Edit
      </EuiButton>,
    ],
  };
}
