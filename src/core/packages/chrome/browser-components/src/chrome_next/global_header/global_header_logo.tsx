/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import React from 'react';
import { useProjectHome, useBasePath, useCustomBranding } from '../../shared/chrome_hooks';
import { LoadingIndicator } from '../../shared/loading_indicator';
import { headerButtonBaseStyles, useHeaderButtonStyleVars } from './header_action_button';

const LOGO_ARIA_LABEL = i18n.translate('core.ui.chrome.globalHeader.logoAriaLabel', {
  defaultMessage: 'Elastic home',
});

const logoLinkStyles = css`
  ${headerButtonBaseStyles};
  width: 32px;
  justify-content: center;
  border: none;
  text-decoration: none;
  color: inherit;

  svg {
    width: 20px;
    height: 20px;
  }
`;

export const GlobalHeaderLogo = React.memo(() => {
  const basePath = useBasePath();
  const homeHref = basePath.prepend(useProjectHome());
  const { logo: customLogo } = useCustomBranding();
  const styleVars = useHeaderButtonStyleVars();

  return (
    <a
      href={homeHref}
      aria-label={LOGO_ARIA_LABEL}
      data-test-subj="chromeNextGlobalHeaderLogo"
      css={logoLinkStyles}
      style={styleVars}
    >
      <LoadingIndicator customLogo={customLogo} elasticLogoColor={'text'} />
    </a>
  );
});

GlobalHeaderLogo.displayName = 'GlobalHeaderLogo';
