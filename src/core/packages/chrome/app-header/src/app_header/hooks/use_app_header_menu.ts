/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { APP_MENU_SHARE_ID, getTooltip } from '@kbn/core-chrome-app-menu-components';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useObservable } from '@kbn/use-observable';
const createFeedbackMenuItem = (feedbackHandler: () => void): AppMenuItemType => ({
  label: 'Feedback',
  id: 'feedback',
  iconType: 'comment',
  order: 1,
  run: feedbackHandler,
});

interface ResolvedAppMenu {
  menu: AppMenuConfig | undefined;
  shareItem: AppMenuItemType | undefined;
}

const useResolvedAppMenu = (
  menu: AppMenuConfig | undefined,
  hasExplicitShare: boolean
): ResolvedAppMenu => {
  return useMemo((): ResolvedAppMenu => {
    if (!menu) return { menu: undefined, shareItem: undefined };

    const shareItem = hasExplicitShare
      ? undefined
      : menu.items?.find((item) => item.id === APP_MENU_SHARE_ID);

    if (!shareItem) return { menu, shareItem: undefined };

    return {
      menu: { ...menu, items: menu.items?.filter((item) => item.id !== APP_MENU_SHARE_ID) },
      shareItem,
    };
  }, [menu, hasExplicitShare]);
};

export function useAppHeaderMenu(
  pageAppMenu: AppMenuConfig | undefined,
  hasExplicitShare: boolean
): {
  config: AppMenuConfig | undefined;
  staticItems: AppMenuItemType[];
} {
  const { menu } = useResolvedAppMenu(pageAppMenu, hasExplicitShare);
  const chrome = useChromeService();
  const feedbackHandler = useObservable(chrome.getFeedbackHandler$(), undefined);

  return {
    config: menu,
    staticItems: feedbackHandler ? [createFeedbackMenuItem(feedbackHandler)] : [],
  };
}

export interface ShareAction {
  onClick: () => void;
  tooltipContent?: string;
  tooltipTitle?: string;
  testId?: string;
}

export function useShareAction(
  pageAppMenu: AppMenuConfig | undefined,
  onShare?: () => void
): ShareAction | undefined {
  const { shareItem } = useResolvedAppMenu(pageAppMenu, !!onShare);

  return useMemo(() => {
    if (onShare) return { onClick: onShare };
    if (!shareItem) return undefined;
    const { run, tooltipContent, tooltipTitle, testId } = shareItem;
    if (!run) return undefined;

    const { content, title } = getTooltip({
      tooltipContent,
      tooltipTitle,
    });

    return {
      onClick: () => run(),
      tooltipContent: content,
      tooltipTitle: title,
      testId,
    };
  }, [onShare, shareItem]);
}
