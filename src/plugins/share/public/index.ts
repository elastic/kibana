/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SharePlugin } from './plugin';

export { CSV_QUOTE_VALUES_SETTING, CSV_SEPARATOR_SETTING } from '../common/constants';
export { KibanaLocation, LocatorDefinition, LocatorPublic } from '../common/url_service';
export { useLocatorUrl } from '../common/url_service/locators/use_locator_url';
export { KibanaURL } from './kibana_url';
export { downloadFileAs, downloadMultipleAs } from './lib/download_as';
export type { DownloadableContent } from './lib/download_as';
export { SharePluginSetup, SharePluginStart } from './plugin';
export {
  ShareContext,
  ShareContextMenuPanelItem,
  ShareMenuItem,
  ShareMenuProvider,
  ShowShareMenuOptions,
} from './types';
export {
  UrlGeneratorContract,
  UrlGeneratorId,
  UrlGeneratorsDefinition,
  UrlGeneratorsService,
  UrlGeneratorState,
} from './url_generators';
export { UrlGeneratorStateMapping } from './url_generators/url_generator_definition';
export { formatSearchParams, parseSearchParams } from './url_service';

export const plugin = () => new SharePlugin();
