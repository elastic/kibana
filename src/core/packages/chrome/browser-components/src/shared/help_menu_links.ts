/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeStyle,
} from '@kbn/core-chrome-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { EuiContextMenuPanelItemDescriptor, IconType } from '@elastic/eui';
import type React from 'react';
import { i18n } from '@kbn/i18n';
import { isModifiedOrPrevented } from './nav_link';

interface HelpData {
  menuLinks: ChromeHelpMenuLink[];
  extension: ChromeHelpExtension | undefined;
  supportUrl: string;
  globalExtensionMenuLinks: ChromeGlobalHelpExtensionMenuLink[];
  docLinks: DocLinksStart;
  feedbackHandler?: () => void;
  newsfeedHandler?: () => void;
  newsfeedHasNew?: boolean;
}

export interface HelpMenuLinkItem {
  name: string;
  key: string;
  icon?: IconType;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  isExternal?: boolean;
  hasNewIndicator?: boolean;
  dataTestSubj?: string;
}

export interface HelpLinks {
  global: HelpMenuLinkItem[];
  default: HelpMenuLinkItem[];
  extension?: {
    label?: string;
    items: HelpMenuLinkItem[];
  };
}

export const toContextMenuItem = (
  options: HelpMenuLinkItem,
  navigateToUrl: (url: string) => Promise<void> | void,
  closeMenu: () => void
): EuiContextMenuPanelItemDescriptor =>
  ({
    name: options.name,
    key: options.key,
    icon: options.icon,
    'data-test-subj': options.dataTestSubj,
    ...(options.href
      ? {
          href: options.href,
          target: options.target,
          rel: options.rel,
        }
      : {}),
    onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      const isUnmodifiedPrimaryClick = !isModifiedOrPrevented(event) && event.button === 0;

      if (!isModifiedOrPrevented(event)) {
        options.onClick?.();
      }

      if (options.href && !options.isExternal && isUnmodifiedPrimaryClick) {
        event.preventDefault();
        closeMenu();
        navigateToUrl(options.href);
        return;
      }

      if (isUnmodifiedPrimaryClick) {
        closeMenu();
      }
    },
  } as EuiContextMenuPanelItemDescriptor);

const buildNewsfeedLink = (newsfeedHandler?: () => void): ChromeHelpMenuLink[] =>
  newsfeedHandler
    ? [
        {
          title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuWhatsNewTitle', {
            defaultMessage: "What's new?",
          }),
          iconType: 'cheer',
          onClick: newsfeedHandler,
          dataTestSubj: 'helpMenuWhatsNewButton',
        },
      ]
    : [];

const buildFeedbackLink = (feedbackHandler?: () => void): ChromeHelpMenuLink[] =>
  feedbackHandler
    ? [
        {
          title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuGiveFeedbackTitle', {
            defaultMessage: 'Give feedback',
          }),
          iconType: 'comment',
          onClick: feedbackHandler,
          dataTestSubj: 'helpMenuGiveFeedbackButton',
        },
      ]
    : [];

export const buildDefaultContentLinks = ({
  chromeStyle,
  docLinks,
  helpSupportUrl,
  feedbackHandler,
  newsfeedHandler,
}: {
  chromeStyle: ChromeStyle;
  docLinks: DocLinksStart;
  helpSupportUrl: string;
  feedbackHandler?: () => void;
  newsfeedHandler?: () => void;
  newsfeedHasNew?: boolean;
}): ChromeHelpMenuLink[] => [
  ...buildNewsfeedLink(newsfeedHandler),
  {
    title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuOpenGitHubIssueTitle', {
      defaultMessage: 'Open GitHub issue',
    }),
    href: docLinks.links.kibana.createGithubIssue,
    iconType: 'logoGithub',
  },
  {
    title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuAskElasticTitle', {
      defaultMessage: 'Ask support',
    }),
    href: helpSupportUrl,
    iconType: 'question',
  },
  ...buildFeedbackLink(feedbackHandler),
  {
    title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuKibanaDocumentationTitle', {
      defaultMessage: 'Kibana documentation',
    }),
    href:
      chromeStyle === 'project'
        ? docLinks.links.elasticStackGetStarted
        : docLinks.links.kibana.guide,
    iconType: 'documentation',
  },
];

export const buildHelpLinks = ({
  chromeStyle,
  helpData,
}: {
  chromeStyle: ChromeStyle;
  helpData: HelpData;
}): HelpLinks => {
  const global = [...helpData.globalExtensionMenuLinks]
    .sort((a, b) => b.priority - a.priority)
    .map((link) => ({
      name: link.content,
      key: `global-${link.href}`,
      href: link.href,
      target: link.target,
      rel: link.rel,
      icon: link.iconType,
      isExternal: link.external,
      dataTestSubj: link['data-test-subj'],
    }));

  const rawDefaultLinks =
    helpData.menuLinks.length > 0
      ? [
          ...buildNewsfeedLink(helpData.newsfeedHandler),
          ...helpData.menuLinks,
          ...buildFeedbackLink(helpData.feedbackHandler),
        ]
      : buildDefaultContentLinks({
          chromeStyle,
          docLinks: helpData.docLinks,
          helpSupportUrl: helpData.supportUrl,
          feedbackHandler: helpData.feedbackHandler,
          newsfeedHandler: helpData.newsfeedHandler,
          newsfeedHasNew: helpData.newsfeedHasNew,
        });

  const defaultLinks = rawDefaultLinks.map(
    ({ title, href, onClick, dataTestSubj, iconType }, index) => ({
      name: title,
      key: `default-${index}`,
      icon: iconType,
      href,
      target: href ? '_blank' : undefined,
      onClick,
      isExternal: Boolean(href),
      hasNewIndicator:
        dataTestSubj === 'helpMenuWhatsNewButton' && helpData.newsfeedHasNew === true,
      dataTestSubj,
    })
  );

  const extensionItems = helpData.extension?.links?.map((link, index) => {
    const isDocumentation = link.linkType === 'documentation';
    return {
      name: isDocumentation
        ? i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuDocumentation', {
            defaultMessage: 'Documentation',
          })
        : link.content,
      key: `extension-${index}`,
      href: link.href,
      target: link.target ?? (isDocumentation ? '_blank' : undefined),
      rel: link.rel ?? (isDocumentation ? 'noopener' : undefined),
      onClick: !isDocumentation ? link.onClick : undefined,
      isExternal: isDocumentation || link.external,
      dataTestSubj: link['data-test-subj'],
    };
  });

  const hasExtension = (extensionItems?.length ?? 0) > 0;

  return {
    global,
    default: defaultLinks,
    ...(hasExtension
      ? {
          extension: {
            label: helpData.extension?.appName,
            items: extensionItems ?? [],
          },
        }
      : {}),
  };
};
