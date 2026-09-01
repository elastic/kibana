/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { AppMenuStaticItem } from '@kbn/app-menu';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useObservable } from '@kbn/use-observable';
import { i18n } from '@kbn/i18n';

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/ui-app-header';
import { useBasePath, useCanAccessIntegrations } from './chrome';

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
