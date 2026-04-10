/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { COLLAPSED_WIDTH, EXPANDED_WIDTH } from '@kbn/core-chrome-navigation';
import { useSideNavCollapsed } from '@kbn/core-chrome-browser-hooks';
import React, { useMemo } from 'react';
import { useProjectHome, useBasePath, useCustomBranding } from '../../shared/chrome_hooks';
import { LoadingIndicator } from '../../shared/loading_indicator';
import { AiButtonSlot } from './ai_button_slot';

const GLOBAL_HEADER_HEIGHT_PX = 48;

const LOGO_ARIA_LABEL = i18n.translate('core.ui.chrome.globalHeader.logoAriaLabel', {
  defaultMessage: 'Elastic home',
});

const useGlobalHeaderStyles = (isNavCollapsed: boolean) => {
  const { euiTheme } = useEuiTheme();
  const logoWidth = isNavCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return useMemo(() => {
    const root = css`
      display: flex;
      align-items: center;
      height: ${GLOBAL_HEADER_HEIGHT_PX}px;
      box-sizing: border-box;
      padding: 0 ${euiTheme.size.s} 0 0;
      background: ${euiTheme.colors.backgroundTransparent};
    `;

    const leftGroup = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
      flex-shrink: 0;
    `;

    const logoLink = css`
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${logoWidth}px;
      height: ${GLOBAL_HEADER_HEIGHT_PX}px;
      flex-shrink: 0;
    `;

    const switcherSlot = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
    `;

    const spacer = css`
      flex: 1 1 auto;
      min-width: 0;
    `;

    const rightGroup = css`
      display: flex;
      align-items: center;
      flex-shrink: 0;
      gap: ${euiTheme.size.s};
    `;

    const searchSlot = css`
      display: flex;
      align-items: center;
      flex-shrink: 0;
    `;

    const actionsSlot = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
    `;

    return { root, leftGroup, logoLink, switcherSlot, spacer, rightGroup, searchSlot, actionsSlot };
  }, [euiTheme, logoWidth]);
};

export const GlobalHeader = React.memo(() => {
  const { isCollapsed } = useSideNavCollapsed();
  const styles = useGlobalHeaderStyles(isCollapsed);
  const basePath = useBasePath();
  const homeHref = basePath.prepend(useProjectHome());
  const { logo: customLogo } = useCustomBranding();

  return (
    <header css={styles.root} data-test-subj="chromeNextGlobalHeader">
      <div css={styles.leftGroup}>
        <a
          css={styles.logoLink}
          href={homeHref}
          aria-label={LOGO_ARIA_LABEL}
          data-test-subj="chromeNextGlobalHeaderLogo"
        >
          <LoadingIndicator customLogo={customLogo} />
        </a>
        <div css={styles.switcherSlot} data-test-subj="chromeNextGlobalHeaderSwitcher" />
      </div>
      <div css={styles.spacer} />
      <div css={styles.rightGroup}>
        <div css={styles.searchSlot} data-test-subj="chromeNextGlobalHeaderSearch" />
        <div css={styles.actionsSlot} data-test-subj="chromeNextGlobalHeaderActions">
          <AiButtonSlot />
        </div>
      </div>
    </header>
  );
});

GlobalHeader.displayName = 'GlobalHeader';
