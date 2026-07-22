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
import { DiscoverAppHeader } from '@kbn/app-header/discover';
import { AppMenuActionId } from '@kbn/discover-utils';
import { getChromeHeaderBack, getChromeHeaderTitle } from './utils';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useInternalStateSelector } from '../../state_management/redux';
import { useIsChromeNextProjectHeader } from './use_is_chrome_next_project_header';

interface ChromeAppHeaderProps {
  menu?: AppMenuConfig;
  tabsBar?: ReactNode;
  hasTabs?: boolean;
}

export const ChromeAppHeader = ({ menu, tabsBar, hasTabs = false }: ChromeAppHeaderProps) => {
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
    // Share is surfaced as the title-row action but also kept in the overflow menu. Sharing is
    // effectively session-scoped (not tab-scoped), so per design it belongs in the first section
    // right below "New session"/"Open" rather than leading the tab-scoped section. The fractional
    // offset keeps share adjacent-below "New session" without colliding with any order.
    const newSessionItem = menu?.items?.find((item) => item.id === AppMenuActionId.new);

    return {
      ...menu,
      items: menu?.items?.map((item) => {
        // We need more space for the tabs as the title is now in the same row. Move all items to the
        // overflow menu. (Except switch language)
        const overflow = item.id !== AppMenuActionId.switchLanguageMode;

        if (item.id === AppMenuActionId.share && newSessionItem) {
          return {
            ...item,
            overflow,
            order: newSessionItem.order + 0.5,
          } as AppMenuItemType;
        }

        return { ...item, overflow } as AppMenuItemType;
      }),
    };
  }, [menu]);

  if (!isChromeNextProjectHeader) {
    return null;
  }

  return (
    <div // Wrap needed to keep the header border visible when tabs not shown.
      css={css`
        position: relative;
      `}
    >
      <DiscoverAppHeader
        title={title}
        back={back}
        menu={appMenu}
        sticky={false}
        spacing="compact"
        tabsBar={tabsBar}
        borderless={hasTabs}
      />
    </div>
  );
};
