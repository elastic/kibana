/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { UserProfilesServices } from '@kbn/content-management-user-profiles';
import type { ContentListCoreConfig } from './types';
import type { DataSourceConfig } from '../datasource';
import type { ContentListFeatures, Supports } from '../features';
import type { ContentListProviderContextValue } from './content_list_provider';

/**
 * Creates a context value object for ContentListProvider.
 *
 * This utility ensures consistent context value construction across
 * different provider implementations (base, Kibana client, Kibana server).
 *
 * @param config - Core configuration (entity names, item config, etc.).
 * @param dataSource - Data source configuration.
 * @param features - Feature configuration.
 * @param supports - Service availability flags.
 * @param queryKeyScope - Optional query key scope for cache isolation.
 * @param userProfileServices - Optional user profile services.
 * @returns The constructed context value.
 */
export const createContextValue = (
  config: ContentListCoreConfig,
  dataSource: DataSourceConfig<UserContentCommonSchema>,
  features: ContentListFeatures,
  supports: Supports,
  queryKeyScope?: string,
  userProfileServices?: UserProfilesServices
): ContentListProviderContextValue => ({
  dataSource,
  entityName: config.entityName,
  entityNamePlural: config.entityNamePlural,
  item: config.item,
  isReadOnly: config.isReadOnly,
  queryKeyScope,
  features: {
    search: true,
    filtering: true,
    ...features,
  },
  supports,
  userProfileServices,
});
