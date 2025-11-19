/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type {
  ContentListKibanaProviderBaseProps,
  DataSourceConfig,
} from '@kbn/content-list-provider';
import {
  ContentListProvider,
  createUserProfileAdapter,
  SERVER_SEARCH_DEBOUNCE_MS,
} from '@kbn/content-list-provider';
import type { SearchFieldsConfig } from './strategy';
import { createSearchItemsStrategy } from './strategy';

/**
 * Props for the Server Kibana provider.
 *
 * This provider uses the content_management list API with server-side sorting, filtering,
 * and pagination. Best suited for larger datasets where operations should be done server-side.
 *
 * @template T The item type from the datasource.
 */
export interface ContentListServerKibanaProviderProps<T = UserContentCommonSchema>
  extends Omit<ContentListKibanaProviderBaseProps<T>, 'savedObjectType'> {
  /** The saved object type(s) to fetch. Can be a single type or array for multi-type search. */
  savedObjectType: string | string[];
  /**
   * Configuration for additional attributes to request from the search API.
   * Use this for custom attributes like `status`, `version`, etc.
   */
  searchFieldsConfig?: SearchFieldsConfig;
}

/**
 * Server-side Kibana provider for content list functionality.
 *
 * Uses the `/internal/content_management/list` API to fetch saved objects with
 * **server-side** sorting, filtering, and pagination. This approach delegates
 * all operations to the server for better performance with large datasets.
 *
 * Best suited for:
 * - Larger datasets (> 10,000 items)
 * - Content types without `.keyword` mappings on text fields
 * - Cases requiring advanced search capabilities (full ES query DSL)
 * - Multi-type searches
 *
 * For smaller datasets or client-side operations, use `ContentListClientKibanaProvider`
 * from `@kbn/content-list-provider-client` instead.
 *
 * @example
 * ```tsx
 * import { ContentListServerKibanaProvider } from '@kbn/content-list-provider-server';
 *
 * const savedObjectsTagging = savedObjectsTaggingService?.getTaggingApi();
 *
 * <ContentListServerKibanaProvider
 *   entityName="map"
 *   entityNamePlural="maps"
 *   savedObjectType="map"
 *   searchFieldsConfig={{
 *     additionalAttributes: ['status', 'version'],
 *   }}
 *   services={{
 *     core: coreStart,
 *     savedObjectsTagging: { ui: savedObjectsTagging.ui },
 *     favorites: favoritesService,
 *   }}
 * >
 *   <MyContentList />
 * </ContentListServerKibanaProvider>
 * ```
 */
export const ContentListServerKibanaProvider = <
  T extends UserContentCommonSchema = UserContentCommonSchema
>({
  children,
  services: servicesProp,
  features = {},
  entityName,
  entityNamePlural,
  item,
  isReadOnly,
  queryKeyScope,
  savedObjectType,
  searchFieldsConfig,
  transform,
}: PropsWithChildren<ContentListServerKibanaProviderProps<T>>): JSX.Element => {
  const {
    core: { userProfile, http },
    savedObjectsTagging,
    favorites,
  } = servicesProp;

  // Create findItems using the search strategy with server-side processing.
  // All sorting, filtering, and pagination is done on the server.
  const dataSource = useMemo(() => {
    const { findItems } = createSearchItemsStrategy({
      savedObjectType,
      http,
      searchFieldsConfig,
    });

    return {
      findItems,
      transform,
      // Debounce server requests while user is typing.
      debounceMs: SERVER_SEARCH_DEBOUNCE_MS,
    } as DataSourceConfig<UserContentCommonSchema>;
  }, [savedObjectType, http, searchFieldsConfig, transform]);

  // Build services object for the base provider.
  // Tags and userProfile are derived from Kibana dependencies, not from services prop.
  const services = useMemo(
    () => ({
      tags: {
        getTagList: savedObjectsTagging.ui.getTagList,
      },
      favorites,
      userProfile: createUserProfileAdapter(userProfile),
    }),
    [savedObjectsTagging, favorites, userProfile]
  );

  return (
    <ContentListProvider
      entityName={entityName}
      entityNamePlural={entityNamePlural}
      item={item}
      isReadOnly={isReadOnly}
      queryKeyScope={queryKeyScope}
      dataSource={dataSource}
      services={services}
      features={features}
    >
      {children}
    </ContentListProvider>
  );
};
