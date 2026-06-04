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
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
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
}

export const ChromeAppHeader = ({ menu, titleAppend, isCollapsed }: ChromeAppHeaderProps) => {
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
    return {
      ...menu,
      items: menu?.items?.map((item) => ({
        ...item,
        // We need more space for the tabs as the title is now in the same row. Move all items to the overflow menu.
        // (Except switch language)
        overflow: item.id !== AppMenuActionId.switchLanguageMode,
      })),
    };
  }, [menu]);

  if (!isChromeNextProjectHeader) {
    return null;
  }

  return (
    <AppHeader
      title={title}
      back={back}
      menu={appMenu}
      menuIsCollapsed={isCollapsed}
      sticky={false}
      padding="m"
      titleAppend={titleAppend}
    />
  );
};
