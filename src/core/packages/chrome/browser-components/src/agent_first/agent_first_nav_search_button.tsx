/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac, useKeyboardShortcut } from '@kbn/shared-ux-utility';
import { useGlobalSearch } from '../shared/chrome_hooks';

const ARIA_LABEL = i18n.translate('core.ui.chrome.agentFirstNav.searchButton.ariaLabel', {
  defaultMessage: 'Search',
});

const SHORTCUT = { key: '/', meta: isMac };

export const AgentFirstNavSearchButton = () => {
  const config = useGlobalSearch();

  useKeyboardShortcut(SHORTCUT, config?.onClick);

  if (!config) {
    return null;
  }

  return (
    <EuiToolTip
      content={ARIA_LABEL}
      disableScreenReaderOutput
      position="right"
      repositionOnScroll
    >
      <div
        css={css`
          display: flex;
          justify-content: center;
          width: 100%;
        `}
      >
        <EuiButtonIcon
          aria-label={ARIA_LABEL}
          data-menu-item="true"
          data-test-subj="agentFirstNavSearchButton"
          display="empty"
          iconType="search"
          onClick={config.onClick}
          size="s"
        />
      </div>
    </EuiToolTip>
  );
};
