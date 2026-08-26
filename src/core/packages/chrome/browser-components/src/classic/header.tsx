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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import classnames from 'classnames';
import type { ReactNode } from 'react';
import React, { createRef, useMemo, useState } from 'react';
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

const maybeItem = (node: ReactNode, key: string) =>
  node ? <EuiHeaderSectionItem key={key}>{node}</EuiHeaderSectionItem> : null;

const invert = (node: ReactNode) =>
  node ? <ClassicHeaderDarkColorMode>{node}</ClassicHeaderDarkColorMode> : null;

const useClassicHeaderStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => css`
      .header__firstBar {
        .euiHeaderSection {
          align-items: center;
        }
      }

      .header__secondBar {
        .euiHeaderSection {
          align-items: center;
        }

        .euiHeaderSectionItem {
          padding-block: 0;
          padding-inline: 0;
        }

        .header__toggleNavButtonSection {
          padding-inline: ${euiTheme.size.s} ${euiTheme.size.xs};
        }

        .euiHeaderBreadcrumbs {
          margin: 0;
          padding-inline-start: ${euiTheme.size.s};
        }
      }
    `,
    [euiTheme]
  );
};

export const ClassicHeader = React.memo(() => {
  const breadcrumbs = useClassicBreadcrumbs();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [navId] = useState(htmlIdGenerator()());
  const hasAppMenuConfig = useHasAppMenuConfig();
  const hasInlineAppHeader = useHasInlineAppHeader();
  const contextSwitcher = useContextSwitcher();
  const projectPicker = useProjectPicker();
  const userMenu = useUserMenu();
  const styles = useClassicHeaderStyles();

  const toggleCollapsibleNavRef = createRef<HTMLButtonElement & { euiAnimate: () => void }>();
  const className = classnames('hide-for-sharing', 'headerGlobalNav');

  const Breadcrumbs = <HeaderBreadcrumbs breadcrumbs={breadcrumbs} />;

  return (
    <>
      <header className={className} data-test-subj="headerGlobalNav">
        <div id="globalHeaderBars" className="header__bars" css={styles}>
          <EuiHeader
            theme="dark"
            position={'static'}
            className="header__firstBar"
            sections={[
              {
                items: [<HeaderPageAnnouncer breadcrumbs={breadcrumbs} />, <HeaderLogo />],
              },
              {
                items: [invert(<SearchButton layout="expanded" />)],
              },
              {
                items: [
                  <GlobalHeaderRightGroup
                    help={invert(<HelpButton />)}
                    actions={<AiButtonSlot />}
                    userMenu={invert(userMenu)}
                  />,
                ],
              },
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
              {maybeItem(contextSwitcher, 'contextSwitcher')}
              {maybeItem(projectPicker, 'projectPicker')}
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
