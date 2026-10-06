/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IConfigService } from '@kbn/config';
import type { BrowserLoggingConfig } from '@kbn/core-logging-common-internal';
import type { UiSettingsParams, UserProvidedValues } from '@kbn/core-ui-settings-common';
export declare const getSettingValue: <T>(
  settingName: string,
  settings: {
    user?: Record<string, UserProvidedValues<unknown>>;
    defaults: Readonly<Record<string, Omit<UiSettingsParams, 'schema'>>>;
  },
  convert: (raw: unknown) => T
) => T;
export declare const getBundlesHref: (baseHref: string) => string;
export declare const getCommonStylesheetPaths: ({ baseHref }: { baseHref: string }) => string[];
export declare const getThemeStylesheetPaths: ({
  darkMode,
  baseHref,
}: {
  darkMode: boolean;
  baseHref: string;
}) => string[];
export declare const getBrowserLoggingConfig: (
  configService: IConfigService
) => Promise<BrowserLoggingConfig>;
