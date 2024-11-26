/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ThemeServiceSetup } from '@kbn/core-theme-browser';
import { I18nStart } from '@kbn/core/public';
import React, { type PropsWithChildren, createContext, useContext } from 'react';

import { AnonymousAccessServiceContract } from '../../../common';
import type {
  ShareMenuItemV2,
  UrlParamExtension,
  BrowserUrlService,
  ShareContext,
} from '../../types';

export type { ShareMenuItemV2 } from '../../types';

export interface IShareContext extends ShareContext {
  allowEmbed: boolean;
  allowShortUrl: boolean;
  shareMenuItems: ShareMenuItemV2[];
  embedUrlParamExtensions?: UrlParamExtension[];
  anonymousAccess?: AnonymousAccessServiceContract;
  urlService: BrowserUrlService;
  snapshotShareWarning?: string;
  theme: ThemeServiceSetup;
  i18n: I18nStart;
  publicAPIEnabled?: boolean;
  anchorElement?: HTMLElement;
}

const ShareTabsContext = createContext<IShareContext | null>(null);

export const ShareMenuProvider = ({
  shareContext,
  children,
}: PropsWithChildren<{ shareContext: IShareContext }>) => {
  return <ShareTabsContext.Provider value={shareContext}>{children}</ShareTabsContext.Provider>;
};

export const useShareTabsContext = () => {
  const context = useContext(ShareTabsContext);

  if (!context) {
    throw new Error(
      'Failed to call `useShareTabsContext` because the context from ShareMenuProvider is missing. Ensure the component or React root is wrapped with ShareMenuProvider'
    );
  }

  return context;
};
