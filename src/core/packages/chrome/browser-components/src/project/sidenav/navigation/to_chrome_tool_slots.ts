/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ChromeNextGlobalSearchConfig } from '@kbn/core-chrome-browser';
import type {
  SecondaryMenuItem,
  SecondaryMenuSection,
  ToolItem,
  ToolSlots,
} from '@kbn/core-chrome-navigation/types';
import type { HelpLinks, HelpMenuLinkItem } from '../../../shared/help_menu_links';

export interface ToolSlotsInput {
  globalSearch?: ChromeNextGlobalSearchConfig;
  helpLinks: HelpLinks;
}

export const buildToolSlots = (input: ToolSlotsInput): ToolSlots => ({
  headerTools: getHeaderTools(input.globalSearch),
  footerTools: getFooterTools(input.helpLinks),
});

const getHeaderTools = (globalSearch?: ChromeNextGlobalSearchConfig): ToolItem[] => {
  if (!globalSearch) {
    return [];
  }

  return [
    {
      id: 'globalSearch',
      label: i18n.translate('core.chrome.projectSideNav.globalSearchLabel', {
        defaultMessage: 'Search',
      }),
      iconType: 'search',
      onClick: globalSearch.onClick,
    },
  ];
};

const getFooterTools = (helpLinks: HelpLinks): ToolItem[] => {
  const helpItem = getHelpToolItem(helpLinks);
  return helpItem ? [helpItem] : [];
};

const getHelpToolItem = (helpLinks: HelpLinks): ToolItem | undefined => {
  const sections = buildHelpSections(helpLinks);

  if (sections.length === 0) {
    return undefined;
  }

  return {
    id: 'help',
    label: i18n.translate('core.chrome.projectSideNav.helpLabel', {
      defaultMessage: 'Help',
    }),
    iconType: 'question',
    sections,
  };
};

const buildHelpSections = (helpLinks: HelpLinks): SecondaryMenuSection[] => {
  const mainItems = toSecondaryItems([...helpLinks.global, ...helpLinks.default]);
  const extensionItems = toSecondaryItems(helpLinks.extension?.items ?? []);

  const sections: SecondaryMenuSection[] = [];
  if (mainItems.length > 0) {
    sections.push({ id: 'help', items: mainItems });
  }
  if (extensionItems.length > 0) {
    sections.push({
      id: 'helpExtension',
      label: helpLinks.extension?.label,
      items: extensionItems,
    });
  }
  return sections;
};

const toSecondaryItems = (items: HelpMenuLinkItem[]): SecondaryMenuItem[] =>
  items
    .filter(
      (
        item
      ): item is typeof item & {
        href: string;
        label: string;
      } => Boolean(item.href) && typeof item.label === 'string'
    )
    .map(({ id, label, href, 'data-test-subj': dataTestSubj, isExternal }) => ({
      id,
      label,
      href,
      'data-test-subj': dataTestSubj,
      isExternal,
    }));
