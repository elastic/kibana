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
import { getChromeHeaderBack, getChromeHeaderTitle } from './utils';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useInternalStateSelector } from '../../state_management/redux';
import { useIsChromeNextProjectHeader } from './use_is_chrome_next_project_header';

interface ChromeAppHeaderProps {
  menu?: AppMenuConfig;
  titleAppend?: ReactNode;
}

export const ChromeAppHeader = ({ menu, titleAppend }: ChromeAppHeaderProps) => {
  const { embeddableEditor } = useDiscoverServices();
  const isChromeNextProjectHeader = useIsChromeNextProjectHeader();
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );

  const title = useMemo(() => {
    if (!isChromeNextProjectHeader) {
      return '';
    }

    return getChromeHeaderTitle({
      embeddableEditor,
      sessionTitle: persistedDiscoverSession?.title,
    });
  }, [embeddableEditor, isChromeNextProjectHeader, persistedDiscoverSession?.title]);

  const back = useMemo(() => {
    if (!isChromeNextProjectHeader) {
      return undefined;
    }

    return getChromeHeaderBack(embeddableEditor);
  }, [embeddableEditor, isChromeNextProjectHeader]);

  if (!isChromeNextProjectHeader) {
    return null;
  }

  return (
    <AppHeader
      title={title}
      back={back}
      menu={menu}
      sticky={false}
      padding="m"
      titleAppend={titleAppend}
    />
  );
};
