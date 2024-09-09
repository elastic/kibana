/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ThemeServiceSetup } from '@kbn/core-theme-browser';
import { I18nStart } from '@kbn/core/public';
import { createContext, useContext } from 'react';

import { AnonymousAccessServiceContract } from '../../../common';
import type {
  ShareMenuItem,
  UrlParamExtension,
  BrowserUrlService,
  ShareContext,
} from '../../types';

export type { ShareMenuItemV2 } from '../../types';

export interface IShareContext extends ShareContext {
  allowEmbed: boolean;
  allowShortUrl: boolean;
  shareMenuItems: ShareMenuItem[];
  embedUrlParamExtensions?: UrlParamExtension[];
  anonymousAccess?: AnonymousAccessServiceContract;
  urlService: BrowserUrlService;
  snapshotShareWarning?: string;
  isEmbedded: boolean;
  theme: ThemeServiceSetup;
  i18n: I18nStart;
  publicAPIEnabled?: boolean;
  anchorElement?: HTMLElement;
}

export const ShareTabsContext = createContext<IShareContext | null>(null);

export const useShareTabsContext = () => useContext(ShareTabsContext);
