/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { HeaderActionButton } from './header_action_button';
import { MOTION_REFRESH_SIDEBAR_APP_ID } from './motion_refresh_sidebar';

const buttonLabel = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshButtonAriaLabel', {
  defaultMessage: 'Motion refresh',
});

/** Opens the motion refresh side panel. Visible in development only. */
export const MotionRefreshButton = () => {
  const { sidebar } = useChromeService();
  const isDev = process.env.NODE_ENV === 'development';
  const isRegistered = isDev && sidebar.hasApp(MOTION_REFRESH_SIDEBAR_APP_ID);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isRegistered) return;
    const app = sidebar.getApp(MOTION_REFRESH_SIDEBAR_APP_ID);
    setIsOpen(app.isOpen());
    const subscription = app.isOpen$().subscribe(setIsOpen);
    return () => subscription.unsubscribe();
  }, [isRegistered, sidebar]);

  if (!isRegistered) return null;

  const onClick = () => {
    const app = sidebar.getApp(MOTION_REFRESH_SIDEBAR_APP_ID);
    if (app.isOpen()) {
      app.close();
      return;
    }
    app.open();
  };

  return (
    <EuiToolTip content={buttonLabel} disableScreenReaderOutput>
      <HeaderActionButton
        variant="bordered"
        onClick={onClick}
        aria-expanded={isOpen}
        aria-label={buttonLabel}
        data-test-subj="kbnChromeHeader-motionRefreshButton"
      >
        <EuiIcon type="play" size="m" color="subdued" aria-hidden />
      </HeaderActionButton>
    </EuiToolTip>
  );
};
