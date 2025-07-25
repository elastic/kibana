/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiButtonEmptyProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';

import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { ChromeHelpMenuLink } from '@kbn/core-chrome-browser/src';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';

import { css } from '@emotion/react';
import { HeaderExtension } from './header_extension';
import { isModifiedOrPrevented } from './nav_link';
import { useChromeObservable } from '../../store';

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
    title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuGiveFeedbackTitle', {
      defaultMessage: 'Give feedback',
    }),
    href: docLinks.links.kibana.feedback,
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
  kibanaVersion: string;
  kibanaDocLink: string;
  docLinks: DocLinksStart;
  isServerless: boolean;
}

export const HeaderHelpMenu: React.FC<Props> = (props) => {
  const { navigateToUrl, kibanaVersion, kibanaDocLink, docLinks, isServerless } = props;

  const { euiTheme } = useEuiTheme();

  const helpExtension = useChromeObservable((state) => state.helpExtension$);
  const helpSupportUrl = useChromeObservable((state) => state.helpSupportUrl$);
  const globalHelpExtensionMenuLinks = useChromeObservable(
    (state) => state.globalHelpExtensionMenuLinks$
  );
  let defaultContentLinks = useChromeObservable((state) => state.helpMenuLinks$);
  if (!defaultContentLinks || defaultContentLinks.length === 0)
    defaultContentLinks = buildDefaultContentLinks({
      kibanaDocLink,
      docLinks,
      helpSupportUrl,
    });

  const [isOpen, setIsOpen] = useState(false);

  // Handlers
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const onMenuButtonClick = useCallback(() => setIsOpen((o) => !o), []);
  const createOnClickHandler = useCallback(
    (href: string, navigate: Props['navigateToUrl']) =>
      (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if (!isModifiedOrPrevented(event) && event.button === 0) {
          event.preventDefault();
          closeMenu();
          navigate(href);
        }
      },
    [closeMenu]
  );

  // Render helpers
  const renderDefaultContent = () => (
    <Fragment>
      {defaultContentLinks!.map(({ href, title, onClick: _onClick, dataTestSubj }, i) => {
        const isLast = i === defaultContentLinks!.length - 1;
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
          <Fragment key={i}>
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

  const renderGlobalCustomContent = () =>
    globalHelpExtensionMenuLinks
      .sort((a, b) => b.priority - a.priority)
      .map((link, index) => {
        const { linkType, content: text, href, external, ...rest } = link;
        return createCustomLink(index, text, true, {
          href,
          onClick: external ? undefined : createOnClickHandler(href, navigateToUrl),
          ...rest,
        });
      });

  const renderCustomContent = () => {
    if (!helpExtension) return null;
    const { appName, links, content } = helpExtension;

    const getFeedbackText = () =>
      i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuGiveFeedbackOnApp', {
        defaultMessage: 'Give feedback on {appName}',
        values: { appName: helpExtension.appName },
      });

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
              { target: '_blank', rel: 'noopener', ...rest }
            );
          }
          case 'github': {
            const { linkType, labels, title, ...rest } = link;
            return createCustomLink(index, getFeedbackText(), addSpacer, {
              iconType: 'logoGithub',
              href: createGithubUrl(labels, title),
              target: '_blank',
              rel: 'noopener',
              ...rest,
            });
          }
          case 'discuss': {
            const { linkType, ...rest } = link;
            return createCustomLink(index, getFeedbackText(), addSpacer, {
              iconType: 'editorComment',
              target: '_blank',
              rel: 'noopener',
              ...rest,
            });
          }
          case 'custom': {
            const { linkType, content: text, href, external, ...rest } = link;
            return createCustomLink(index, text, addSpacer, {
              href,
              onClick: createOnClickHandler(href, navigateToUrl),
              ...rest,
            });
          }
          default:
            return null;
        }
      });

    return (
      <>
        <EuiPopoverTitle>
          <h3>{appName}</h3>
        </EuiPopoverTitle>
        {customLinks}
        {content && (
          <>
            {customLinks && <EuiSpacer size="xs" />}
            <HeaderExtension
              extension={(domNode) => content(domNode, { hideHelpMenu: closeMenu })}
            />
          </>
        )}
      </>
    );
  };

  const euiThemePadding = css`
    padding: ${euiTheme.size.s};
  `;

  const button = (
    <EuiHeaderSectionItemButton
      aria-expanded={isOpen}
      aria-haspopup="true"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuButtonAriaLabel', {
        defaultMessage: 'Help menu',
      })}
      onClick={onMenuButtonClick}
    >
      <EuiIcon type="question" size="m" />
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
        {renderGlobalCustomContent()}
        {renderDefaultContent()}
        {renderCustomContent() && (
          <>
            <EuiPopoverFooter css={euiThemePadding} />
            {renderCustomContent()}
          </>
        )}
      </div>
    </EuiPopover>
  );
};

// ----------------------------

const createGithubUrl = (labels: string[], title?: string) => {
  const url = new URL('https://github.com/elastic/kibana/issues/new?');

  if (labels.length) {
    url.searchParams.set('labels', labels.join(','));
  }

  if (title) {
    url.searchParams.set('title', title);
  }

  return url.toString();
};

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
