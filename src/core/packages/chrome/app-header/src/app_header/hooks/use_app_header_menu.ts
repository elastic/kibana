/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { AppMenuConfig, AppMenuStaticItem } from '@kbn/core-chrome-app-menu-components';
import { APP_MENU_SHARE_ID, getTooltip, isDisabled } from '@kbn/core-chrome-app-menu-components';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useObservable } from '@kbn/use-observable';
import { i18n } from '@kbn/i18n';
import type { AppHeaderShareAction } from '../../types';

import { useBasePath, useCanAccessIntegrations } from './chrome';
import { APP_HEADER_TEST_SUBJECTS } from '../test_subjects';

const createIntegrationsMenuItem = (href: string): AppMenuStaticItem => ({
  label: i18n.translate('core.chrome.appHeader.addIntegrationsMenuItemLabel', {
    defaultMessage: 'Add integrations',
  }),
  id: 'addIntegrations',
  iconType: 'indexOpen',
  order: 0,
  href,
  testId: APP_HEADER_TEST_SUBJECTS.menuAddIntegrations,
});

const createFeedbackMenuItem = (feedbackHandler: () => void): AppMenuStaticItem => ({
  label: i18n.translate('core.chrome.appHeader.feedbackMenuItemLabel', {
    defaultMessage: 'Feedback',
  }),
  id: 'feedback',
  iconType: 'comment',
  order: 1,
  run: feedbackHandler,
  global: true,
  testId: APP_HEADER_TEST_SUBJECTS.menuFeedback,
});

const createDocumentationMenuItem = (href: string): AppMenuStaticItem => ({
  label: i18n.translate('core.chrome.appHeader.documentationMenuItemLabel', {
    defaultMessage: 'Documentation',
  }),
  id: 'documentation',
  iconType: 'documentation',
  order: 2,
  href,
  target: '_blank',
  testId: APP_HEADER_TEST_SUBJECTS.menuDocumentation,
});

export const useAppHeaderStaticItems = ({
  docLink: explicitDocLink,
  showAddIntegrations,
}: {
  docLink?: string;
  showAddIntegrations?: boolean;
}): AppMenuStaticItem[] => {
  const chrome = useChromeService();
  const basePath = useBasePath();
  const canAccessIntegrations = useCanAccessIntegrations();
  const feedbackHandler = useObservable(chrome.next.getFeedbackHandler$(), undefined);
  const helpExtension = useObservable(chrome.getHelpExtension$(), undefined);

  return useMemo(() => {
    const staticItems: AppMenuStaticItem[] = [];

    if (feedbackHandler) {
      staticItems.push(createFeedbackMenuItem(feedbackHandler));
    }

    /**
     * Precedence: <AppHeader/> docLink prop -> chrome.getAppDocumentationLink$() -> chrome.getHelpExtension$()
     */
    const docLink =
      explicitDocLink ??
      helpExtension?.links?.find((link) => link.linkType === 'documentation')?.href;

    if (docLink) {
      staticItems.push(createDocumentationMenuItem(docLink));
    }

    if (showAddIntegrations && canAccessIntegrations) {
      staticItems.push(createIntegrationsMenuItem(basePath.prepend('/app/integrations/browse')));
    }

    return staticItems;
  }, [
    basePath,
    canAccessIntegrations,
    explicitDocLink,
    helpExtension,
    showAddIntegrations,
    feedbackHandler,
  ]);
};

const SHARE_DEFAULT_TOOLTIP = i18n.translate('core.ui.chrome.appHeader.shareAriaLabel', {
  defaultMessage: 'Share',
});

/**
 * Temporary bridge: derive Share from a legacy app-menu item with `id: 'share'`.
 * Prefer the typed `AppHeaderConfig.share` action. Remove once apps are migrated.
 * https://github.com/elastic/kibana/issues/271401
 */
export function useShareActionFromMenu(
  pageAppMenu: AppMenuConfig | undefined
): AppHeaderShareAction | undefined {
  const shareItem = pageAppMenu?.items?.find((item) => item.id === APP_MENU_SHARE_ID);

  return useMemo(() => {
    if (!shareItem) return undefined;
    const { run, tooltipContent, tooltipTitle, disableButton } = shareItem;
    if (!run) return undefined;

    const { content, title } = getTooltip({
      tooltipContent,
      tooltipTitle,
    });

    return {
      onClick: ({ triggerElement, returnFocus }) => {
        run({ triggerElement, returnFocus });
      },
      tooltip:
        content || title
          ? {
              content: content ?? SHARE_DEFAULT_TOOLTIP,
              title,
            }
          : undefined,
      isDisabled: isDisabled(disableButton),
    };
  }, [shareItem]);
}

/** @deprecated Use AppHeaderShareAction from Core. Kept as alias during migration. */
export type ShareAction = AppHeaderShareAction;

/** @deprecated Use useShareActionFromMenu. */
export const useShareAction = useShareActionFromMenu;
