/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HeaderHelpMenu } from '../../shared/header_help_menu';
import { HeaderActionButton } from './header_action_button';

const HELP_ARIA_LABEL = i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuButtonAriaLabel', {
  defaultMessage: 'Help menu',
});

export const HelpButton = React.memo(() => {
  const renderButton = useCallback(
    ({ isOpen, toggleMenu }: { isOpen: boolean; toggleMenu: () => void }) => (
      <HeaderActionButton
        variant="bordered"
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup={true}
        aria-label={HELP_ARIA_LABEL}
        data-test-subj="chromeNextGlobalHeaderHelpButton"
      >
        <EuiIcon type="question" size="m" color="subdued" aria-hidden />
      </HeaderActionButton>
    ),
    []
  );

  return <HeaderHelpMenu renderButton={renderButton} />;
});

HelpButton.displayName = 'HelpButton';
