/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useBasePath, useCustomBranding, useHomeLogoIcon, useProjectHome } from '../../shared/chrome_hooks';
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

export interface ChromeNextGlobalHeaderLogoProps {
  /** When set, overrides `useProjectHome()` (e.g. agent-first solution home nav href). */
  homeHref?: string;
}

export const ChromeNextGlobalHeaderLogo = React.memo(({ homeHref }: ChromeNextGlobalHeaderLogoProps) => {
  const basePath = useBasePath();
  const projectHome = useProjectHome();
  const resolvedHomeHref = basePath.prepend(basePath.remove(homeHref ?? projectHome));
  const { logo: customLogo } = useCustomBranding();
  const homeLogoIcon = useHomeLogoIcon();
  const styleVars = useHeaderButtonStyleVars();
  const iconType = customLogo ? undefined : homeLogoIcon ?? 'logoElastic';

  return (
    <a
      href={resolvedHomeHref}
      aria-label={LOGO_ARIA_LABEL}
      data-test-subj="nav-header-logo"
      css={logoLinkStyles}
      style={styleVars}
    >
      <LoadingIndicator
        customLogo={customLogo}
        iconType={iconType}
        elasticLogoColor={iconType === 'logoElastic' ? 'text' : undefined}
      />
    </a>
  );
});

ChromeNextGlobalHeaderLogo.displayName = 'ChromeNextGlobalHeaderLogo';
