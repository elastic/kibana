/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/public';

export type { ConfigSchema } from '../server/config';

export { CSV_QUOTE_VALUES_SETTING, CSV_SEPARATOR_SETTING } from '../common/constants';

export type { LocatorDefinition, LocatorPublic, KibanaLocation } from '../common/url_service';

export type {
  SharePublicSetup as SharePluginSetup,
  SharePublicStart as SharePluginStart,
} from './plugin';

export type {
  ShareContext,
  ShareMenuProvider,
  ShareMenuItem,
  ShareMenuItemV2,
  ShowShareMenuOptions,
  ShareContextMenuPanelItem,
  BrowserUrlService,
} from './types';

export type { RedirectOptions } from '../common/url_service';
export { useLocatorUrl } from '../common/url_service/locators/use_locator_url';

import { SharePlugin } from './plugin';

export { downloadMultipleAs, downloadFileAs } from './lib/download_as';
export type { DownloadableContent } from './lib/download_as';

export function plugin(ctx: PluginInitializerContext) {
  return new SharePlugin(ctx);
}
