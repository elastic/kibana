/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { CSV_QUOTE_VALUES_SETTING, CSV_SEPARATOR_SETTING } from '../common/constants';

export { LocatorDefinition, LocatorPublic, KibanaLocation } from '../common/url_service';
export { parseSearchParams, formatSearchParams } from './url_service';

export { UrlGeneratorStateMapping } from './url_generators/url_generator_definition';

export { SharePluginSetup, SharePluginStart } from './plugin';

export {
  ShareContext,
  ShareMenuProvider,
  ShareMenuItem,
  ShowShareMenuOptions,
  ShareContextMenuPanelItem,
} from './types';

export {
  UrlGeneratorId,
  UrlGeneratorState,
  UrlGeneratorsDefinition,
  UrlGeneratorContract,
  UrlGeneratorsService,
} from './url_generators';

export { useLocatorUrl } from '../common/url_service/locators/use_locator_url';

import { SharePlugin } from './plugin';

export { KibanaURL } from './kibana_url';
export { downloadMultipleAs, downloadFileAs } from './lib/download_as';
export type { DownloadableContent } from './lib/download_as';

export const plugin = () => new SharePlugin();
