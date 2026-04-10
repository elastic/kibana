/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useProjectHome, useBasePath, useCustomBranding } from '../../shared/chrome_hooks';
import { LoadingIndicator } from '../../shared/loading_indicator';

const LOGO_ARIA_LABEL = i18n.translate('core.ui.chrome.globalHeader.logoAriaLabel', {
  defaultMessage: 'Elastic home',
});

export const GlobalHeaderLogo = React.memo(() => {
  const basePath = useBasePath();
  const homeHref = basePath.prepend(useProjectHome());
  const { logo: customLogo } = useCustomBranding();

  return (
    <a href={homeHref} aria-label={LOGO_ARIA_LABEL} data-test-subj="chromeNextGlobalHeaderLogo">
      <LoadingIndicator customLogo={customLogo} />
    </a>
  );
});

GlobalHeaderLogo.displayName = 'GlobalHeaderLogo';
