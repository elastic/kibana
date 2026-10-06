/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type AvailableLocale } from '@kbn/i18n';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import type { I18nServiceSetup } from '@kbn/core-i18n-server';
export interface PrebootDeps {
  http: InternalHttpServicePreboot;
  pluginPaths: string[];
}
export interface SetupDeps {
  http: InternalHttpServiceSetup;
  pluginPaths: string[];
}
export interface InternalI18nServicePreboot {
  getTranslationHash(): string;
  getTranslationHashes(): Record<string, string>;
  getAvailableLocales(): ReadonlyArray<AvailableLocale>;
  allowLocaleCookie: boolean;
}
export declare class I18nService {
  private readonly coreContext;
  private readonly log;
  private readonly configService;
  constructor(coreContext: CoreContext);
  preboot({ pluginPaths, http }: PrebootDeps): Promise<InternalI18nServicePreboot>;
  setup({ pluginPaths, http }: SetupDeps): Promise<I18nServiceSetup>;
  private initTranslations;
}
