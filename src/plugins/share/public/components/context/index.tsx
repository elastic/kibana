/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext } from 'react';
import { ReportingAPIClient } from '@kbn/reporting-public';

import { JobParamsPNGV2 } from '@kbn/reporting-export-types-png-common';
import { JobParamsPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import { IUiSettingsClient, ThemeServiceSetup, ToastsSetup } from '@kbn/core/public';
import { BaseParams } from '@kbn/reporting-common/types';
import type {
  ShareMenuItem,
  UrlParamExtension,
  BrowserUrlService,
  ShareContext,
} from '../../types';
import { AnonymousAccessServiceContract } from '../../../common';
import { JobParamsProviderOptions } from '../share/share_context_menu';

export interface IShareContext extends ShareContext {
  allowEmbed: boolean;
  allowShortUrl: boolean;
  shareMenuItems: ShareMenuItem[];
  embedUrlParamExtensions?: UrlParamExtension[];
  anonymousAccess?: AnonymousAccessServiceContract;
  urlService: BrowserUrlService;
  snapshotShareWarning?: string;
  objectTypeTitle?: string;
  isEmbedded: boolean;
  layoutOption?: 'print' | 'canvas';
  apiClient: ReportingAPIClient;
  getJobParams?:
    | JobParamsPDFV2
    | JobParamsPNGV2
    | ((forShareUrl?: boolean) => Omit<BaseParams, 'browserTimezone' | 'version'>);
  jobProviderOptions?: JobParamsProviderOptions;
  toasts: ToastsSetup;
  theme: ThemeServiceSetup;
  // intl: InjectedIntl;
  uiSettings: IUiSettingsClient;
  csvType: 'csv_v2' | 'csv_searchsource';
  requiresSavedState: boolean;
}

export const ShareTabsContext = createContext<IShareContext | null>(null);

export const useShareTabsContext = () => useContext(ShareTabsContext);
