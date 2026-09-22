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
  htmlIdGenerator,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classnames from 'classnames';
import type { ReactNode } from 'react';
import React, { createRef, useState } from 'react';
import { CollapsibleNav } from './collapsible_nav';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderLogo } from './header_logo';
import { HeaderMenuButton } from './header_menu_button';
import { HeaderAppMenu } from '../shared/header_app_menu';
import { HeaderActionMenu } from '../shared/header_action_menu';
import { BreadcrumbsWithExtensionsWrapper } from '../shared/breadcrumbs_with_extensions';
import { HeaderPageAnnouncer } from '../shared/header_page_announcer';
import {
  useClassicBreadcrumbs,
  useContextSwitcher,
  useHasAppMenuConfig,
  useHasInlineAppHeader,
  useProjectPicker,
  useUserMenu,
} from '../shared/chrome_hooks';
import { SearchButton } from '../chrome_next/global_header/search_button';
import { AiButtonSlot } from '../chrome_next/global_header/ai_button_slot';
import { HelpButton } from '../chrome_next/global_header/help_button';
import { GlobalHeaderRightGroup } from '../chrome_next/global_header/global_header_shell';
import { ClassicHeaderDarkColorMode } from '../shared/header_color_mode';

const dark = (node: ReactNode) =>
  node ? <ClassicHeaderDarkColorMode>{node}</ClassicHeaderDarkColorMode> : null;

export const ClassicHeader = React.memo(() => {
  const breadcrumbs = useClassicBreadcrumbs();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [navId] = useState(htmlIdGenerator()());
  const hasAppMenuConfig = useHasAppMenuConfig();
  const hasInlineAppHeader = useHasInlineAppHeader();
  const userMenu = useUserMenu();
  const contextSwitcher = useContextSwitcher();
  const projectPicker = useProjectPicker();
  const isSmall = useIsWithinMaxBreakpoint('s');
  const search = dark(<SearchButton layout={isSmall ? 'compact' : 'expanded'} />);
  const rightGroup = (
    <GlobalHeaderRightGroup
      search={isSmall ? search : undefined}
      help={dark(<HelpButton />)}
      actions={<AiButtonSlot />}
      userMenu={userMenu}
    />
  );

  const toggleCollapsibleNavRef = createRef<HTMLButtonElement & { euiAnimate: () => void }>();
  const className = classnames('hide-for-sharing', 'headerGlobalNav');

  const Breadcrumbs = <HeaderBreadcrumbs breadcrumbs={breadcrumbs} />;

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
                  <>
                    <HeaderPageAnnouncer breadcrumbs={breadcrumbs} />
                    <HeaderLogo />
                  </>,
                ],
              },
              ...(!isSmall ? [{ items: [search] }] : []),
              { items: [rightGroup] },
            ]}
          />

          <EuiHeader position={'static'} className="header__secondBar">
            <EuiHeaderSection grow={false}>
              <EuiHeaderSectionItem className="header__toggleNavButtonSection">
                <CollapsibleNav
                  id={navId}
                  isNavOpen={isNavOpen}
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
              {contextSwitcher ? (
                <EuiHeaderSectionItem>{contextSwitcher}</EuiHeaderSectionItem>
              ) : null}
              {projectPicker ? <EuiHeaderSectionItem>{projectPicker}</EuiHeaderSectionItem> : null}
            </EuiHeaderSection>

            <BreadcrumbsWithExtensionsWrapper>{Breadcrumbs}</BreadcrumbsWithExtensionsWrapper>

            {!hasInlineAppHeader && (
              <EuiHeaderSection side="right">
                <EuiHeaderSectionItem>
                  {hasAppMenuConfig ? (
                    <HeaderAppMenu breakpointSource="viewport" />
                  ) : (
                    <HeaderActionMenu />
                  )}
                </EuiHeaderSectionItem>
              </EuiHeaderSection>
            )}
          </EuiHeader>
        </div>
      </header>
    </>
  );
});
