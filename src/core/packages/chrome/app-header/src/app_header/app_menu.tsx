/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense, useMemo } from 'react';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { APP_MENU_SHARE_ID, hasNonGlobalStaticItems } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import type { AppHeaderShareAction } from '../types';
import { useHasLegacyActionMenu } from './hooks/chrome';
import { LegacyHeaderActionMenu } from './legacy_action_menu';
import { useAppHeaderStaticItems } from './hooks';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';

const AppMenuComponent = lazy(async () => {
  const { AppMenuComponent: Component } = await import('@kbn/core-chrome-app-menu-components');
  return { default: Component };
});

const SHARE_LABEL = i18n.translate('core.ui.chrome.appHeader.shareMenuItemLabel', {
  defaultMessage: 'Share',
});

const createOverflowShareMenuItem = (share: AppHeaderShareAction): AppMenuItemType => ({
  id: APP_MENU_SHARE_ID,
  label: SHARE_LABEL,
  iconType: 'share',
  overflow: true,
  order: 0,
  testId: APP_HEADER_TEST_SUBJECTS.shareButton,
  disableButton: share.isDisabled,
  tooltipContent: share.tooltip?.content,
  tooltipTitle: share.tooltip?.title,
  run: (params) => {
    const triggerElement = params?.triggerElement;
    if (!triggerElement) {
      return;
    }
    void share.onClick({
      triggerElement,
      returnFocus: params.returnFocus ?? (() => triggerElement.focus()),
    });
  },
});

export interface AppMenuProps {
  menu?: AppMenuConfig;
  /** When set, App Header injects a standard overflow Share item driven by this action. */
  share?: AppHeaderShareAction;
  docLink?: string;
  showAddIntegrations?: boolean;
}

export const AppMenu = React.memo<AppMenuProps>(({ menu, share, docLink, showAddIntegrations }) => {
  const staticItems = useAppHeaderStaticItems({ docLink, showAddIntegrations });
  const hasLegacyActionMenu = useHasLegacyActionMenu();
  const hasStaticItems = hasNonGlobalStaticItems(staticItems);

  const menuWithShare = useMemo(() => {
    if (!share) {
      return menu;
    }

    const shareItem = createOverflowShareMenuItem(share);
    const itemsWithoutLegacyShare = (menu?.items ?? []).filter(
      (item) => item.id !== APP_MENU_SHARE_ID
    );

    return {
      ...menu,
      items: [...itemsWithoutLegacyShare, shareItem],
    };
  }, [menu, share]);

  if (!menuWithShare && hasLegacyActionMenu) {
    return <LegacyHeaderActionMenu />;
  }

  if (menuWithShare || hasStaticItems) {
    return (
      <Suspense>
        <AppMenuComponent config={menuWithShare} staticItems={staticItems} />
      </Suspense>
    );
  }

  return null;
});

AppMenu.displayName = 'AppMenu';
