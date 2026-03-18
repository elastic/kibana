/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { EuiHeader, EuiHeaderSection, EuiHeaderSectionItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { Breadcrumbs } from './breadcrumbs';
import { HeaderHelpMenu } from '../shared/header_help_menu';
import { HeaderNavControls } from '../shared/header_nav_controls';
import { BreadcrumbsWithExtensionsWrapper } from '../shared/breadcrumbs_with_extensions';
import { HeaderPageAnnouncer } from '../shared/header_page_announcer';
import { LoadingIndicator } from '../shared/loading_indicator';
import {
  useProjectBreadcrumbs,
  useProjectHome,
  useNavigateToUrl,
  useBasePath,
  useCustomBranding,
} from '../shared/chrome_hooks';

const getHeaderCss = ({ size, colors }: EuiThemeComputed) => ({
  logo: {
    container: css`
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: ${size.xxl};
      cursor: pointer;
    `,
  },
  leftHeaderSection: css`
    // needed to enable breadcrumbs truncation
    min-width: 0;
    flex-shrink: 1;
  `,
  breadcrumbsSectionItem: css`
    min-width: 0; // needed to enable breadcrumbs truncation
  `,
  leftNavcontrols: css`
    .navcontrols__separator {
      display: flex;
      margin-right: ${size.xs};
      &:after {
        background: ${colors.lightShade};
        content: '';
        flex-shrink: 0;
        margin-block-start: ${size.xs};
        margin-block-end: 0;
        margin-inline: ${size.s};
        block-size: 16px;
        inline-size: 1px;
        transform: translateY(-1px) rotate(15deg);
      }
    }
  `,
});

type HeaderCss = ReturnType<typeof getHeaderCss>;

const Logo = ({ logoCss }: { logoCss: HeaderCss['logo'] }) => {
  const navigateToUrl = useNavigateToUrl();
  const basePath = useBasePath();
  const homeHref = useProjectHome();
  const customBranding = useCustomBranding();
  const { logo } = customBranding;

  let fullHref: string | undefined;
  if (homeHref) {
    fullHref = basePath.prepend(homeHref);
  }

  const navigateHome = useCallback(
    (event: React.MouseEvent) => {
      if (fullHref) {
        navigateToUrl(fullHref);
      }
      event.preventDefault();
    },
    [fullHref, navigateToUrl]
  );

  return (
    <span css={logoCss.container} data-test-subj="nav-header-logo">
      <a onClick={navigateHome} href={fullHref}>
        <LoadingIndicator customLogo={logo} />
      </a>
    </span>
  );
};

export const ProjectHeader = () => {
  const breadcrumbs = useProjectBreadcrumbs();
  const { euiTheme } = useEuiTheme();
  const headerCss = getHeaderCss(euiTheme);
  const { logo: logoCss } = headerCss;

  const topBarStyles = css`
    box-shadow: none !important;
    background-color: ${euiTheme.colors.backgroundTransparent};
    border-bottom-color: ${euiTheme.colors.backgroundTransparent};
    padding-inline: 4px 8px;
  `;

  return (
    <>
      <header data-test-subj="kibanaProjectHeader">
        <div id="globalHeaderBars" data-test-subj="headerGlobalNav" className="header__bars">
          <EuiHeader position={'static'} className="header__firstBar" css={topBarStyles}>
            <EuiHeaderSection grow={false} css={headerCss.leftHeaderSection}>
              <EuiHeaderSectionItem>
                <HeaderPageAnnouncer breadcrumbs={breadcrumbs} />
                <Logo logoCss={logoCss} />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem css={headerCss.leftNavcontrols}>
                <HeaderNavControls
                  position="left"
                  append={<div className="navcontrols__separator" />}
                />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem css={headerCss.breadcrumbsSectionItem}>
                <BreadcrumbsWithExtensionsWrapper>
                  <Breadcrumbs breadcrumbs={breadcrumbs} />
                </BreadcrumbsWithExtensionsWrapper>
              </EuiHeaderSectionItem>
            </EuiHeaderSection>

            <EuiHeaderSection side="right">
              <EuiHeaderSectionItem>
                <HeaderNavControls position="center" />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem>
                <HeaderHelpMenu />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem
                css={css`
                  gap: ${euiTheme.size.s};
                `}
              >
                <HeaderNavControls position="right" />
              </EuiHeaderSectionItem>
            </EuiHeaderSection>
          </EuiHeader>
        </div>
      </header>
    </>
  );
};
