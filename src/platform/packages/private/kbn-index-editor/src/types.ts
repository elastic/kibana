/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core/public';

export interface EditLookupIndexContentContext {
  indexName?: string;
  onSave?: () => void;
  onClose?: () => void;
}

export interface EditLookupIndexFlyoutDeps {
  coreStart: CoreStart;
  share: SharePluginStart;
  data: DataPublicPluginStart;
}
