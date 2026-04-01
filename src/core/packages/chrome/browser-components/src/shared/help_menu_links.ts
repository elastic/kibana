/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type {
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeStyle,
} from '@kbn/core-chrome-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { i18n } from '@kbn/i18n';

interface HelpData {
  menuLinks: ChromeHelpMenuLink[];
  extension: ChromeHelpExtension | undefined;
  supportUrl: string;
  globalExtensionMenuLinks: ChromeGlobalHelpExtensionMenuLink[];
  docLinks: DocLinksStart;
}

export interface HelpMenuLinkItem {
  id: string;
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  'data-test-subj'?: string;
  isExternal?: boolean;
  rel?: string;
  target?: string;
}

export interface HelpLinks {
  global: HelpMenuLinkItem[];
  default: HelpMenuLinkItem[];
  extension?: {
    label?: string;
    items: HelpMenuLinkItem[];
    renderContent?: ChromeHelpExtension['content'];
  };
}

export const buildDefaultContentLinks = ({
  chromeStyle,
  docLinks,
  helpSupportUrl,
}: {
  chromeStyle: ChromeStyle;
  docLinks: DocLinksStart;
  helpSupportUrl: string;
}): ChromeHelpMenuLink[] => [
  {
    title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuKibanaDocumentationTitle', {
      defaultMessage: 'Kibana documentation',
    }),
    href:
      chromeStyle === 'project'
        ? docLinks.links.elasticStackGetStarted
        : docLinks.links.kibana.guide,
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

export const buildHelpLinks = ({
  chromeStyle,
  helpData,
}: {
  chromeStyle: ChromeStyle;
  helpData: HelpData;
}): HelpLinks => {
  const global = [...helpData.globalExtensionMenuLinks]
    .sort((a, b) => b.priority - a.priority)
    .map(({ content, external, priority, ...link }, index) => ({
      id: `help-global-${index}`,
      label: content,
      href: link.href,
      'data-test-subj': link['data-test-subj'],
      isExternal: external || link.target === '_blank',
      rel: link.rel,
      target: link.target,
    }));

  const rawDefaultLinks =
    helpData.menuLinks.length > 0
      ? helpData.menuLinks
      : buildDefaultContentLinks({
          chromeStyle,
          docLinks: helpData.docLinks,
          helpSupportUrl: helpData.supportUrl,
        });

  const defaultLinks = rawDefaultLinks.map(({ title, href, onClick, dataTestSubj }, index) => ({
    id: `help-default-${index}`,
    label: title,
    href,
    onClick,
    'data-test-subj': dataTestSubj,
    isExternal: Boolean(href),
    target: href ? '_blank' : undefined,
  }));

  const extensionItems = helpData.extension?.links?.map((link, index) => {
    if (link.linkType === 'documentation') {
      return {
        id: `help-extension-${index}`,
        label: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuDocumentation', {
          defaultMessage: 'Documentation',
        }),
        href: link.href,
        'data-test-subj': link['data-test-subj'],
        isExternal: true,
        rel: link.rel ?? 'noopener',
        target: link.target ?? '_blank',
      };
    }

    return {
      id: `help-extension-${index}`,
      label: link.content,
      href: link.href,
      'data-test-subj': link['data-test-subj'],
      isExternal: link.external || link.target === '_blank',
      rel: link.rel,
      target: link.target,
    };
  });

  const hasExtension = (extensionItems?.length ?? 0) > 0 || helpData.extension?.content;

  return {
    global,
    default: defaultLinks,
    ...(hasExtension
      ? {
          extension: {
            label: helpData.extension?.appName,
            items: extensionItems ?? [],
            renderContent: helpData.extension?.content,
          },
        }
      : {}),
  };
};
