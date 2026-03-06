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
import { useChromeComponentsDeps } from '../context';
import { CollapsibleNav } from './collapsible_nav';
import { HeaderBadge } from './header_badge';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderLogo } from './header_logo';
import { HeaderMenuButton } from './header_menu_button';
import { HeaderAppMenu } from '../shared/header_app_menu';
import { HeaderHelpMenu } from '../shared/header_help_menu';
import { HeaderNavControls } from '../shared/header_nav_controls';
import { HeaderActionMenu } from '../shared/header_action_menu';
import { BreadcrumbsWithExtensionsWrapper } from '../shared/breadcrumbs_with_extensions';
import { HeaderPageAnnouncer } from '../shared/header_page_announcer';
import { useHasAppMenuConfig } from '../shared/use_has_app_menu_config';

export function ClassicHeader() {
  const {
    config,
    application,
    basePath,
    docLinks,
    loadingCount$,
    navControls,
    classic,
    breadcrumbsAppendExtensions$,
    customBranding$,
    helpMenu,
    navLinks$,
  } = useChromeComponentsDeps();

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [navId] = useState(htmlIdGenerator()());
  const hasAppMenuConfig = useHasAppMenuConfig();

  const toggleCollapsibleNavRef = createRef<HTMLButtonElement & { euiAnimate: () => void }>();
  const className = classnames('hide-for-sharing', 'headerGlobalNav');

  const Breadcrumbs = <HeaderBreadcrumbs breadcrumbs$={classic.breadcrumbs$} />;

  return (
    <>
      <header className={className} data-test-subj="headerGlobalNav">
        <div id="globalHeaderBars" className="header__bars">
          <EuiHeader
            theme="dark"
            position={'static'}
            className="header__firstBar"
            sections={[
              {
                items: [
                  <HeaderPageAnnouncer
                    breadcrumbs$={classic.breadcrumbs$}
                    customBranding$={customBranding$}
                  />,
                  <HeaderLogo
                    href={config.homeHref}
                    navigateToApp={application.navigateToApp}
                    loadingCount$={loadingCount$}
                    customBranding$={customBranding$}
                  />,
                ],
              },
              {
                ...(navControls.center$ && {
                  items: [
                    <EuiShowFor sizes={['m', 'l', 'xl']}>
                      <HeaderNavControls navControls$={navControls.center$} />
                    </EuiShowFor>,
                  ],
                }),
              },
              {
                items: [
                  <EuiHideFor sizes={['m', 'l', 'xl']}>
                    <>
                      <HeaderNavControls navControls$={navControls.extension$} />
                      <HeaderNavControls navControls$={navControls.center$} />
                    </>
                  </EuiHideFor>,
                  <EuiHideFor sizes={['xs', 's']}>
                    <HeaderNavControls navControls$={navControls.extension$} />
                  </EuiHideFor>,
                  <HeaderHelpMenu
                    isServerless={config.isServerless}
                    globalHelpExtensionMenuLinks$={helpMenu.globalExtensionMenuLinks$}
                    helpExtension$={helpMenu.extension$}
                    helpSupportUrl$={helpMenu.supportUrl$}
                    defaultContentLinks$={helpMenu.menuLinks$}
                    kibanaDocLink={config.kibanaDocLink}
                    docLinks={docLinks}
                    kibanaVersion={config.kibanaVersion}
                    navigateToUrl={application.navigateToUrl}
                  />,
                  <HeaderNavControls navControls$={navControls.right$} />,
                ],
              },
            ]}
          />

          <EuiHeader position={'static'} className="header__secondBar">
            <EuiHeaderSection grow={false}>
              <EuiHeaderSectionItem className="header__toggleNavButtonSection">
                <CollapsibleNav
                  appId$={application.currentAppId$}
                  id={navId}
                  navLinks$={navLinks$}
                  recentlyAccessed$={classic.recentlyAccessed$}
                  isNavOpen={isNavOpen}
                  homeHref={config.homeHref}
                  basePath={basePath}
                  navigateToApp={application.navigateToApp}
                  navigateToUrl={application.navigateToUrl}
                  closeNav={() => {
                    setIsNavOpen(false);
                  }}
                  customNavLink$={classic.customNavLink$}
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

              <HeaderNavControls side="left" navControls$={navControls.left$} />
            </EuiHeaderSection>

            <BreadcrumbsWithExtensionsWrapper
              breadcrumbsAppendExtensions$={breadcrumbsAppendExtensions$}
            >
              {Breadcrumbs}
            </BreadcrumbsWithExtensionsWrapper>

            {/* TODO: Remove once setBadge() is consolidated — https://github.com/elastic/kibana/issues/256050 */}
            <HeaderBadge badge$={classic.badge$} />

            <EuiHeaderSection side="right">
              <EuiHeaderSectionItem>
                {hasAppMenuConfig ? <HeaderAppMenu /> : <HeaderActionMenu />}
              </EuiHeaderSectionItem>
            </EuiHeaderSection>
          </EuiHeader>
        </div>
      </header>
    </>
  );
}
