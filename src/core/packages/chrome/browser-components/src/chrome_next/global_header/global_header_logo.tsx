/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useBasePath, useCustomBranding, useProjectHome } from '../../shared/chrome_hooks';
import { LoadingIndicator } from '../../shared/loading_indicator';

const LOGO_ARIA_LABEL = i18n.translate('core.ui.chrome.globalHeader.logoAriaLabel', {
  defaultMessage: 'Elastic home',
});

const useLogoStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => css`
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: ${euiTheme.border.radius.medium};
      color: ${euiTheme.colors.text};
      text-decoration: none;

      &:hover {
        background: ${euiTheme.colors.backgroundBaseInteractiveHover};
      }

      &:focus-visible {
        outline: 2px solid ${euiTheme.colors.primary};
        outline-offset: -2px;
      }

      svg {
        width: 20px;
        height: 20px;
      }
    `,
    [euiTheme]
  );
};

export const ChromeNextGlobalHeaderLogo = React.memo(() => {
  const basePath = useBasePath();
  const homeHref = basePath.prepend(useProjectHome());
  const { logo: customLogo } = useCustomBranding();
  const logoStyles = useLogoStyles();

  return (
    <a
      href={homeHref}
      aria-label={LOGO_ARIA_LABEL}
      data-test-subj="chromeNextGlobalHeaderLogo"
      css={logoStyles}
    >
      <LoadingIndicator customLogo={customLogo} />
    </a>
  );
});

ChromeNextGlobalHeaderLogo.displayName = 'ChromeNextGlobalHeaderLogo';
