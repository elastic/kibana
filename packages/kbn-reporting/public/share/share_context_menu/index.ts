/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ApplicationStart,
  I18nStart,
  IUiSettingsClient,
  ThemeServiceSetup,
  ToastsSetup,
} from '@kbn/core/public';
import { ILicense } from '@kbn/licensing-plugin/public';
import type { LayoutParams } from '@kbn/screenshotting-plugin/common';
import type { ReportingAPIClient } from '../../reporting_api_client';

export interface ExportModalShareOpts {
  apiClient: ReportingAPIClient;
  uiSettings: IUiSettingsClient;
  usesUiCapabilities: boolean;
  license: ILicense;
  application: ApplicationStart;
  theme: ThemeServiceSetup;
  i18n: I18nStart;
}

export interface ExportPanelShareOpts {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  uiSettings: IUiSettingsClient;
  usesUiCapabilities: boolean;
  license: ILicense;
  application: ApplicationStart;
  theme: ThemeServiceSetup;
}

export interface ReportingSharingData {
  title: string;
  layout: LayoutParams;
  reportingDisabled?: boolean;
  [key: string]: unknown;
}

export interface JobParamsProviderOptions {
  sharingData: ReportingSharingData;
  shareableUrl: string;
  objectType: string;
}
