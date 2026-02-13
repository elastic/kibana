/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHorizontalRule, EuiIcon, EuiKeyPadMenu, EuiKeyPadMenuItem } from '@elastic/eui';
import { css } from '@emotion/react';
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

/**
 * POC: Static header app actions config for Discover (overflow menu + New/Share/Save buttons).
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
          { name: 'Background searches', icon: 'search', onClick: noop },
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
    savePopoverPanels: [
      {
        id: 0,
        title: '',
        items: [
          { name: 'Save as', icon: 'save', onClick: noop },
          { name: 'Reset changes', icon: 'editorUndo', onClick: noop },
        ],
      },
    ],
  };
}
