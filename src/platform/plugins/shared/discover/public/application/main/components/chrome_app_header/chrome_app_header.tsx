/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { AppHeader } from '@kbn/app-header';
import { AppMenuActionId } from '@kbn/discover-utils';
import { getChromeHeaderBack, getChromeHeaderTitle } from './utils';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useInternalStateSelector } from '../../state_management/redux';
import { useIsChromeNextProjectHeader } from './use_is_chrome_next_project_header';

interface ChromeAppHeaderProps {
  menu?: AppMenuConfig;
  titleAppend?: ReactNode;
  isCollapsed?: boolean;
  hasTabs?: boolean;
}

export const ChromeAppHeader = ({
  menu,
  titleAppend,
  isCollapsed,
  hasTabs = false,
}: ChromeAppHeaderProps) => {
  const { embeddableEditor } = useDiscoverServices();
  const isChromeNextProjectHeader = useIsChromeNextProjectHeader();
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );

  const title = useMemo(() => {
    return getChromeHeaderTitle({
      embeddableEditor,
      sessionTitle: persistedDiscoverSession?.title,
    });
  }, [embeddableEditor, persistedDiscoverSession?.title]);

  const back = useMemo(() => {
    return getChromeHeaderBack(embeddableEditor);
  }, [embeddableEditor]);

  const appMenu = useMemo(() => {
    // `use_top_nav_links` marks the first tab-scoped item (export/inspect) with a leading separator.
    // Share is surfaced as the title-row action but also kept in the overflow menu, where we want it
    // to lead that section. Share is an optional plugin, so it may be absent from the menu.
    const sectionLeader = menu?.items?.find((item) => item.separator === 'above');
    const hasShare = menu?.items?.some((item) => item.id === AppMenuActionId.share) ?? false;

    return {
      ...menu,
      isCollapsed,
      items: menu?.items?.map((item) => {
        // We need more space for the tabs as the title is now in the same row. Move all items to the
        // overflow menu. (Except switch language)
        const overflow = item.id !== AppMenuActionId.switchLanguageMode;

        // Place share just above the section leader and hand the leading separator to it. The
        // fractional offset keeps share adjacent-above the leader without colliding with any order.
        if (item.id === AppMenuActionId.share && sectionLeader) {
          return {
            ...item,
            overflow,
            order: sectionLeader.order - 0.5,
            separator: 'above',
          } as AppMenuItemType;
        }

        // The leading separator now belongs to share, so drop it from the section leader. Only when
        // share is present to re-host it, otherwise leave the section's separator intact.
        if (hasShare && item.separator === 'above') {
          return { ...item, overflow, separator: undefined } as AppMenuItemType;
        }

        return { ...item, overflow } as AppMenuItemType;
      }),
    };
  }, [isCollapsed, menu]);

  if (!isChromeNextProjectHeader) {
    return null;
  }

  return (
    <div // Wrap needed to keep the header border visible when tabs not shown.
      css={css`
        position: relative;
      `}
    >
      <AppHeader
        title={title}
        back={back}
        menu={appMenu}
        sticky={false}
        padding="s"
        titleAppend={titleAppend}
        borderless={hasTabs}
      />
    </div>
  );
};
