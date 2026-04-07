/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type {
  ChromeNextGlobalSearchConfig,
  ChromeNextSpaceSelectorConfig,
  ChromeNextUserMenuConfig,
} from '@kbn/core-chrome-browser';
import type {
  SecondaryMenuItem,
  SecondaryMenuSection,
  ToolItem,
  ToolSlots,
} from '@kbn/core-chrome-navigation/types';
import type { HelpLinks, HelpMenuLinkItem } from '../../../shared/help_menu_links';

export interface ToolSlotsInput {
  globalSearch?: ChromeNextGlobalSearchConfig;
  spaceSelector?: ChromeNextSpaceSelectorConfig;
  userMenu?: ChromeNextUserMenuConfig;
  helpLinks: HelpLinks;
}

export const buildToolSlots = (input: ToolSlotsInput): ToolSlots => ({
  headerTools: getHeaderTools(input.globalSearch, input.spaceSelector),
  footerTools: getFooterTools(input.userMenu, input.helpLinks),
});

const getHeaderTools = (
  globalSearch?: ChromeNextGlobalSearchConfig,
  spaceSelector?: ChromeNextSpaceSelectorConfig
): ToolItem[] => {
  const tools: ToolItem[] = [];

  const spaceSelectorItem = getSpaceSelectorToolItem(spaceSelector);
  if (spaceSelectorItem) {
    tools.push(spaceSelectorItem);
  }

  if (globalSearch) {
    tools.push({
      id: 'globalSearch',
      label: i18n.translate('core.chrome.projectSideNav.globalSearchLabel', {
        defaultMessage: 'Search',
      }),
      iconType: 'search',
      onClick: globalSearch.onClick,
    });
  }

  return tools;
};

const getSpaceSelectorToolItem = (
  config: ChromeNextSpaceSelectorConfig | undefined
): ToolItem | undefined => {
  if (!config) {
    return undefined;
  }

  return {
    id: 'spaceSelector',
    label: config.label,
    renderContent: () => config.renderAvatar(),
    renderPopover: (closePopover) => config.renderPopover(closePopover),
    popoverWidth: 360,
    'data-test-subj': 'sideNavSpaceSelector',
  };
};

const getFooterTools = (
  userMenu: ChromeNextUserMenuConfig | undefined,
  helpLinks: HelpLinks
): ToolItem[] => {
  const tools: ToolItem[] = [];
  const userMenuItem = getUserMenuToolItem(userMenu);
  if (userMenuItem) {
    tools.push(userMenuItem);
  }
  const helpItem = getHelpToolItem(helpLinks);
  if (helpItem) {
    tools.push(helpItem);
  }
  return tools;
};

const getUserMenuToolItem = (
  config: ChromeNextUserMenuConfig | undefined
): ToolItem | undefined => {
  if (!config) {
    return undefined;
  }

  const items: SecondaryMenuItem[] = config.items.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    isExternal: item.isExternal,
    'data-test-subj': item['data-test-subj'],
  }));

  if (items.length === 0) {
    return undefined;
  }

  return {
    id: 'userMenu',
    label: config.label,
    renderContent: () => config.renderAvatar(),
    sections: [{ id: 'userMenuLinks', items }],
    'data-test-subj': 'sideNavUserMenu',
  };
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
