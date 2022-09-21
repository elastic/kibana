/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreStart, DocLinksStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { AutocompleteStart } from '@kbn/unified-search-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';

export interface VisDefaultEditorKibanaServices {
  data: DataPublicPluginStart;
  appName: string;
  unifiedSearch: {
    autocomplete: AutocompleteStart;
  };
  usageCollection?: UsageCollectionStart;
  storage: IStorageWrapper;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  docLinks: DocLinksStart;
  uiSettings: CoreStart['uiSettings'];
}
