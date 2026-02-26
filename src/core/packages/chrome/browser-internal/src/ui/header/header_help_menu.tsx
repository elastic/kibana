/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useState, useCallback, useMemo } from 'react';
import type { Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiButtonEmptyProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiPopoverFooter,
  useEuiTheme,
} from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';

import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type {
  ChromeHelpExtension,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpMenuLink,
} from '@kbn/core-chrome-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';

import { css } from '@emotion/react';
import { HeaderExtension } from './header_extension';
import { isModifiedOrPrevented } from './nav_link';

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

interface Props {
  navigateToUrl: InternalApplicationStart['navigateToUrl'];
  globalHelpExtensionMenuLinks$: Observable<ChromeGlobalHelpExtensionMenuLink[]>;
  helpExtension$: Observable<ChromeHelpExtension | undefined>;
  helpSupportUrl$: Observable<string>;
  defaultContentLinks$: Observable<ChromeHelpMenuLink[]>;
  kibanaVersion: string;
  kibanaDocLink: string;
  docLinks: DocLinksStart;
  isServerless: boolean;
}

const createCustomLink = (
  index: number,
  text: React.ReactNode,
  addSpacer?: boolean,
  buttonProps?: EuiButtonEmptyProps
) => {
  return (
    <Fragment key={`helpButton${index}`}>
      <EuiButtonEmpty {...buttonProps} size="s" flush="left">
        {text}
      </EuiButtonEmpty>
      {addSpacer && <EuiSpacer size="xs" />}
    </Fragment>
  );
};

export const HeaderHelpMenu = ({
  navigateToUrl,
  globalHelpExtensionMenuLinks$,
  helpExtension$,
  helpSupportUrl$,
  defaultContentLinks$,
  kibanaVersion,
  kibanaDocLink,
  docLinks,
  isServerless,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const helpExtension = useObservable(helpExtension$, undefined);
  const helpSupportUrl = useObservable(helpSupportUrl$, '');
  const globalHelpExtensionMenuLinks = useObservable(globalHelpExtensionMenuLinks$, []);
  const providedDefaultContentLinks = useObservable(defaultContentLinks$, []);

  const defaultContentLinks = useMemo(
    () =>
      providedDefaultContentLinks.length === 0
        ? buildDefaultContentLinks({ kibanaDocLink, docLinks, helpSupportUrl })
        : providedDefaultContentLinks,
    [providedDefaultContentLinks, kibanaDocLink, docLinks, helpSupportUrl]
  );

  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

  const helpExtensionContent = helpExtension?.content;
  const helpExtensionMount = useCallback(
    (domNode: HTMLDivElement) => {
      const unmount = helpExtensionContent?.(domNode, { hideHelpMenu: closeMenu });
      return unmount ?? (() => {});
    },
    [helpExtensionContent, closeMenu]
  );

  const createOnClickHandler = useCallback(
    (href: string) => (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (!isModifiedOrPrevented(event) && event.button === 0) {
        event.preventDefault();
        closeMenu();
        navigateToUrl(href);
      }
    },
    [closeMenu, navigateToUrl]
  );

  const euiThemePadding = css`
    padding: ${euiTheme.size.s};
  `;

  const defaultContent = (
    <Fragment>
      {defaultContentLinks.map(({ href, title, onClick: _onClick, dataTestSubj }, idx) => {
        const isLast = idx === defaultContentLinks.length - 1;

        if (href && _onClick) {
          throw new Error(
            'Only one of `href` and `onClick` should be provided for the help menu link.'
          );
        }

        const hrefProps = href ? { href, target: '_blank' } : {};
        const onClick = () => {
          if (!_onClick) return;
          _onClick();
          closeMenu();
        };

        return (
          <Fragment key={idx}>
            <EuiButtonEmpty
              {...hrefProps}
              onClick={onClick}
              size="s"
              flush="left"
              data-test-subj={dataTestSubj}
            >
              {title}
            </EuiButtonEmpty>
            {!isLast && <EuiSpacer size="xs" />}
          </Fragment>
        );
      })}
    </Fragment>
  );

  const globalCustomContent = globalHelpExtensionMenuLinks
    .sort((a, b) => b.priority - a.priority)
    .map((link, index) => {
      const { linkType, content: text, href, external, ...rest } = link;
      return createCustomLink(index, text, true, {
        href,
        onClick: external ? undefined : createOnClickHandler(href),
        ...rest,
      });
    });

  let customContent: React.ReactNode = null;
  if (helpExtension) {
    const { appName, links, content } = helpExtension;

    const customLinks =
      links &&
      links.map((link, index) => {
        const addSpacer = index < links.length - 1;
        switch (link.linkType) {
          case 'documentation': {
            const { linkType, ...rest } = link;
            return createCustomLink(
              index,
              <FormattedMessage
                id="core.ui.chrome.headerGlobalNav.helpMenuDocumentation"
                defaultMessage="Documentation"
              />,
              addSpacer,
              {
                target: '_blank',
                rel: 'noopener',
                ...rest,
              }
            );
          }
          case 'custom': {
            const { linkType, content: text, href, external, ...rest } = link;
            return createCustomLink(index, text, addSpacer, {
              href,
              onClick: createOnClickHandler(href),
              ...rest,
            });
          }
          default:
            break;
        }
      });

    customContent = (
      <>
        <EuiPopoverTitle>
          <h3>{appName}</h3>
        </EuiPopoverTitle>
        {customLinks}
        {content && (
          <>
            {customLinks && <EuiSpacer size="xs" />}
            <HeaderExtension extension={helpExtensionMount} />
          </>
        )}
      </>
    );
  }

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
    >
      <EuiPopoverTitle>
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem>
            <h2>
              <FormattedMessage
                id="core.ui.chrome.headerGlobalNav.helpMenuTitle"
                defaultMessage="Help"
              />
            </h2>
          </EuiFlexItem>
          {!isServerless && (
            <EuiFlexItem
              grow={false}
              css={{ textTransform: 'none' }}
              data-test-subj="kbnVersionString"
            >
              <FormattedMessage
                id="core.ui.chrome.headerGlobalNav.helpMenuVersion"
                defaultMessage="v {version}"
                values={{ version: kibanaVersion }}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopoverTitle>

      <div style={{ maxWidth: 240 }}>
        {globalCustomContent}
        {defaultContent}
        {customContent && (
          <>
            <EuiPopoverFooter css={euiThemePadding} />
            {customContent}
          </>
        )}
      </div>
    </EuiPopover>
  );
};
