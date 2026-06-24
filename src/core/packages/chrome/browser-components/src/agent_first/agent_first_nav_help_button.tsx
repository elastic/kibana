/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HeaderHelpMenu } from '../shared/header_help_menu';

const HELP_ARIA_LABEL = i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuButtonAriaLabel', {
  defaultMessage: 'Help menu',
});

export const AgentFirstNavHelpButton = () => {
  const renderButton = useCallback(
    ({ isOpen, toggleMenu }: { isOpen: boolean; toggleMenu: () => void }) => (
      <EuiToolTip
        content={HELP_ARIA_LABEL}
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
            aria-expanded={isOpen}
            aria-haspopup={true}
            aria-label={HELP_ARIA_LABEL}
            color="text"
            data-menu-item="true"
            data-test-subj="agentFirstNavHelpButton"
            display="empty"
            iconType="question"
            onClick={toggleMenu}
            size="s"
          />
        </div>
      </EuiToolTip>
    ),
    []
  );

  return <HeaderHelpMenu renderButton={renderButton} anchorPosition="rightUp" />;
};
