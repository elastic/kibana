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
import { useAppMenu, useNextHeader } from '../../../shared/chrome_hooks';

interface ResolvedAppMenu {
  menu: AppMenuConfig | undefined;
  shareItem: AppMenuItemType | undefined;
}

function useResolvedAppMenu(): ResolvedAppMenu {
  const config = useNextHeader();
  const globalAppMenu = useAppMenu();
  const menu = config?.appMenu ?? globalAppMenu;
  const hasExplicitShare = !!config?.globalActions?.share;

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
}

/**
 * Returns the resolved app menu with the `share` item stripped out.
 * The share action is auto-promoted to the global actions area by Chrome.
 */
export function useAppHeaderMenu(): AppMenuConfig | undefined {
  return useResolvedAppMenu().menu;
}

export interface ShareAction {
  onClick: () => void;
  tooltipContent?: string;
  tooltipTitle?: string;
  testId?: string;
}

/**
 * Returns a share action auto-extracted from the app menu,
 * or built from the explicitly set `globalActions.share` if provided.
 * Includes tooltip data from the app menu item when available.
 */
export function useShareAction(): ShareAction | undefined {
  const config = useNextHeader();
  const { shareItem } = useResolvedAppMenu();
  const explicitShare = config?.globalActions?.share?.onClick;

  return useMemo(() => {
    if (explicitShare) return { onClick: explicitShare };
    if (!shareItem?.run) return undefined;

    const { content, title } = getTooltip({
      tooltipContent: shareItem.tooltipContent,
      tooltipTitle: shareItem.tooltipTitle,
    });

    return {
      onClick: () => shareItem.run!(),
      tooltipContent: content,
      tooltipTitle: title,
      testId: shareItem.testId,
    };
  }, [explicitShare, shareItem]);
}
