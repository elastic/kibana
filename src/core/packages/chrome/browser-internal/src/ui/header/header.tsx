/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiHeader,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHideFor,
  EuiShowFor,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classnames from 'classnames';
import React, { createRef, useState } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { css } from '@emotion/react';
import { CollapsibleNav } from './collapsible_nav';
import { HeaderBadge } from './header_badge';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderHelpMenu } from './header_help_menu';
import { HeaderLogo } from './header_logo';
import { HeaderNavControls } from './header_nav_controls';
import { HeaderActionMenu } from './header_action_menu';
import { BreadcrumbsWithExtensionsWrapper } from './breadcrumbs_with_extensions';
import { HeaderTopBanner } from './header_top_banner';
import { HeaderMenuButton } from './header_menu_button';
import { ScreenReaderRouteAnnouncements, SkipToMainContent } from './screen_reader_a11y';
import { useChromeObservable } from '../../store';

export interface HeaderProps {
  kibanaVersion: string;
  application: InternalApplicationStart;
  homeHref: string;
  kibanaDocLink: string;
  docLinks: DocLinksStart;
  basePath: HttpStart['basePath'];
  isServerless: boolean;
  isFixed: boolean;
  as: 'div' | 'header';
  includeBanner: boolean;
}

export function Header({
  kibanaVersion,
  kibanaDocLink,
  docLinks,
  application,
  basePath,
  homeHref,
  isServerless,
  isFixed,
  as = 'header',
  includeBanner,
}: HeaderProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [navId] = useState(htmlIdGenerator()());

  const navControlsCenter = useChromeObservable((state) => state.navControlsCenter$);
  const navControlsLeft = useChromeObservable((state) => state.navControlsLeft$);
  const navControlsRight = useChromeObservable((state) => state.navControlsRight$);
  const navControlsExtension = useChromeObservable((state) => state.navControlsExtension$);
  const headerActionMenuMounter = useChromeObservable((state) => state.currentActionMenu$);
  const breadcrumbs = useChromeObservable((state) => state.breadcrumbs$);

  const toggleCollapsibleNavRef = createRef<HTMLButtonElement & { euiAnimate: () => void }>();
  const className = classnames('hide-for-sharing', 'headerGlobalNav');

  const Breadcrumbs = <HeaderBreadcrumbs />;
  const HeaderElement = as === 'header' ? 'header' : 'div';

  return (
    <>
      <ScreenReaderRouteAnnouncements breadcrumbs={breadcrumbs} />
      <SkipToMainContent />

      {includeBanner && <HeaderTopBanner />}
      <HeaderElement className={className} data-test-subj="headerGlobalNav">
        <div id="globalHeaderBars" className="header__bars">
          <EuiHeader
            theme="dark"
            position={isFixed ? 'fixed' : 'static'}
            className="header__firstBar"
            sections={[
              {
                items: [<HeaderLogo href={homeHref} navigateToApp={application.navigateToApp} />],
              },
              {
                ...(navControlsCenter && {
                  items: [
                    <EuiShowFor sizes={['m', 'l', 'xl']}>
                      <HeaderNavControls navControls={navControlsCenter} />
                    </EuiShowFor>,
                  ],
                }),
              },
              {
                items: [
                  <EuiHideFor sizes={['m', 'l', 'xl']}>
                    <>
                      <HeaderNavControls navControls={navControlsExtension} />
                      <HeaderNavControls navControls={navControlsCenter} />
                    </>
                  </EuiHideFor>,
                  <EuiHideFor sizes={['xs', 's']}>
                    <HeaderNavControls navControls={navControlsExtension} />
                  </EuiHideFor>,
                  <HeaderHelpMenu
                    isServerless={isServerless}
                    kibanaDocLink={kibanaDocLink}
                    docLinks={docLinks}
                    kibanaVersion={kibanaVersion}
                    navigateToUrl={application.navigateToUrl}
                  />,
                  <HeaderNavControls navControls={navControlsRight} />,
                ],
              },
            ]}
          />

          <EuiHeader position={isFixed ? 'fixed' : 'static'} className="header__secondBar">
            <EuiHeaderSection grow={false}>
              <EuiHeaderSectionItem className="header__toggleNavButtonSection">
                <CollapsibleNav
                  id={navId}
                  isNavOpen={isNavOpen}
                  homeHref={homeHref}
                  basePath={basePath}
                  navigateToApp={application.navigateToApp}
                  navigateToUrl={application.navigateToUrl}
                  closeNav={() => {
                    setIsNavOpen(false);
                  }}
                  button={
                    <HeaderMenuButton
                      data-test-subj="toggleNavButton"
                      aria-label={i18n.translate('core.ui.primaryNav.header.toggleNavAriaLabel', {
                        defaultMessage: 'Toggle primary navigation',
                      })}
                      onClick={() => setIsNavOpen(!isNavOpen)}
                      aria-expanded={isNavOpen}
                      aria-pressed={isNavOpen}
                      aria-controls={navId}
                      forwardRef={toggleCollapsibleNavRef}
                    />
                  }
                />
              </EuiHeaderSectionItem>

              <HeaderNavControls side="left" navControls={navControlsLeft} />
            </EuiHeaderSection>
            <RedirectAppLinks
              coreStart={{ application }}
              css={css`
                min-width: 0; // enable text truncation for long breadcrumb titles
              `}
            >
              <BreadcrumbsWithExtensionsWrapper>{Breadcrumbs}</BreadcrumbsWithExtensionsWrapper>
            </RedirectAppLinks>

            <HeaderBadge />

            <EuiHeaderSection side="right">
              <EuiHeaderSectionItem>
                <HeaderActionMenu mounter={{ mount: headerActionMenuMounter }} />
              </EuiHeaderSectionItem>
            </EuiHeaderSection>
          </EuiHeader>
        </div>
      </HeaderElement>
    </>
  );
}
