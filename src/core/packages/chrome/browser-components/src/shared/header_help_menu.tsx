/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEvent } from 'react';
import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import {
  EuiContextMenu,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';

import type { ChromeHelpMenuLink } from '@kbn/core-chrome-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { useIsServerless, useKibanaVersion } from '@kbn/react-env';
import { useChromeStyle } from '@kbn/core-chrome-browser-hooks';

import { css } from '@emotion/react';
import { isModifiedOrPrevented } from './nav_link';
import { useHelpMenu, useNavigateToUrl, useDocLinks } from './chrome_hooks';

const buildDefaultContentLinks = ({
  kibanaDocLink,
  docLinks,
  helpSupportUrl,
}: {
  kibanaDocLink: string;
  docLinks: DocLinksStart;
  helpSupportUrl: string;
}): ChromeHelpMenuLink[] => [
  {
    title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuKibanaDocumentationTitle', {
      defaultMessage: 'Kibana documentation',
    }),
    href: kibanaDocLink,
  },
  {
    title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuAskElasticTitle', {
      defaultMessage: 'Ask Elastic',
    }),
    href: helpSupportUrl,
  },
  {
    title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuOpenGitHubIssueTitle', {
      defaultMessage: 'Open an issue in GitHub',
    }),
    href: docLinks.links.kibana.createGithubIssue,
  },
];

export const HeaderHelpMenu = () => {
  const navigateToUrl = useNavigateToUrl();
  const docLinks = useDocLinks();
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const isServerless = useIsServerless();
  const kibanaVersion = useKibanaVersion();
  const chromeStyle = useChromeStyle();
  const kibanaDocLink =
    chromeStyle === 'project' ? docLinks.links.elasticStackGetStarted : docLinks.links.kibana.guide;

  const appNameStyle = useMemo(
    () => css`
      font-weight: ${euiTheme.font.weight.bold};
    `,
    [euiTheme.font.weight.bold]
  );

  const {
    menuLinks: providedDefaultContentLinks,
    extension: helpExtension,
    supportUrl: helpSupportUrl,
    globalExtensionMenuLinks: globalHelpExtensionMenuLinks,
  } = useHelpMenu();

  const defaultContentLinks = useMemo(
    () =>
      providedDefaultContentLinks.length === 0
        ? buildDefaultContentLinks({ kibanaDocLink, docLinks, helpSupportUrl })
        : providedDefaultContentLinks,
    [providedDefaultContentLinks, kibanaDocLink, docLinks, helpSupportUrl]
  );

  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

  const handleItemClick = useCallback(
    ({
      onClick,
      href,
      isExternal,
    }: {
      onClick?: () => void;
      href?: string;
      isExternal?: boolean;
    }): ((e: MouseEvent) => void) => {
      return (e: MouseEvent) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        } else if (
          href &&
          !isExternal &&
          !isModifiedOrPrevented(e as MouseEvent<HTMLElement>) &&
          e.button === 0
        ) {
          e.preventDefault();
          navigateToUrl(href);
        }
        closeMenu();
      };
    },
    [closeMenu, navigateToUrl]
  );

  const items = useMemo(() => {
    const menuItems: EuiContextMenuPanelItemDescriptor[] = [];

    // Global extension links (e.g. cloud data migration)
    globalHelpExtensionMenuLinks
      .sort((a, b) => b.priority - a.priority)
      .forEach((link) => {
        menuItems.push({
          name: link.content,
          key: `global-${link.href}`,
          href: link.href,
          target: link.target,
          rel: link.rel,
          icon: link.iconType,
          'data-test-subj': link['data-test-subj'],
          onClick: handleItemClick({ href: link.href, isExternal: link.external }),
        });
      });

    // Default links (Kibana docs, Ask Elastic, GitHub)
    defaultContentLinks.forEach((link, idx) => {
      if (link.href && link.onClick) {
        throw new Error(
          'Only one of `href` and `onClick` should be provided for the help menu link.'
        );
      }

      menuItems.push({
        name: link.title,
        key: `default-${idx}`,
        icon: link.iconType,
        'data-test-subj': link.dataTestSubj,
        ...(link.href ? { href: link.href, target: '_blank' } : {}),
        onClick: handleItemClick({
          onClick: link.onClick,
          href: link.href,
          isExternal: !!link.href,
        }),
      });
    });

    // App-specific extension links
    if (helpExtension) {
      menuItems.push({ isSeparator: true, key: 'extension-separator' });

      menuItems.push({
        renderItem: () => (
          <EuiContextMenuItem css={appNameStyle}>{helpExtension.appName}</EuiContextMenuItem>
        ),
        key: 'extension-title',
      });

      helpExtension.links?.forEach((link, idx) => {
        switch (link.linkType) {
          case 'documentation':
            menuItems.push({
              name: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuDocumentation', {
                defaultMessage: 'Documentation',
              }),
              key: `extension-${idx}`,
              href: link.href,
              target: '_blank',
              rel: 'noopener',
              icon: link.iconType,
              'data-test-subj': link['data-test-subj'],
              onClick: handleItemClick({ href: link.href, isExternal: true }),
            });
            break;
          case 'custom':
            menuItems.push({
              name: link.content,
              key: `extension-${idx}`,
              icon: link.iconType,
              'data-test-subj': link['data-test-subj'],
              ...(link.href ? { href: link.href } : {}),
              target: link.target,
              rel: link.rel,
              onClick: handleItemClick({
                onClick: link.onClick,
                href: link.href,
                isExternal: link.external,
              }),
            });
            break;
        }
      });
    }

    return menuItems;
  }, [
    globalHelpExtensionMenuLinks,
    defaultContentLinks,
    helpExtension,
    handleItemClick,
    appNameStyle,
  ]);

  const button = (
    <EuiHeaderSectionItemButton
      aria-expanded={isOpen}
      aria-haspopup="true"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuButtonAriaLabel', {
        defaultMessage: 'Help menu',
      })}
      onClick={toggleMenu}
    >
      <EuiIcon type="question" size="m" aria-hidden={true} />
    </EuiHeaderSectionItemButton>
  );

  return (
    <EuiPopover
      anchorPosition="downRight"
      button={button}
      closePopover={closeMenu}
      data-test-subj="helpMenuButton"
      id="headerHelpMenu"
      isOpen={isOpen}
      repositionOnScroll
      panelPaddingSize="none"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuAriaLabel', {
        defaultMessage: 'Help menu',
      })}
    >
      <EuiContextMenu
        initialPanelId="helpMenu"
        size="s"
        panels={[
          {
            id: 'helpMenu',
            title: (
              <EuiFlexGroup responsive={false}>
                <EuiFlexItem>
                  <FormattedMessage
                    id="core.ui.chrome.headerGlobalNav.helpMenuTitle"
                    defaultMessage="Help"
                  />
                </EuiFlexItem>
                {!isServerless && (
                  <EuiFlexItem grow={false} data-test-subj="kbnVersionString">
                    <FormattedMessage
                      id="core.ui.chrome.headerGlobalNav.helpMenuVersion"
                      defaultMessage="v {version}"
                      values={{ version: kibanaVersion }}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            ),
            items,
          },
        ]}
      />
    </EuiPopover>
  );
};
