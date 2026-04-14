/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState, type ReactNode } from 'react';
import type {
  ContentListCoreConfig,
  ContentListFeatures,
  DataSourceConfig,
} from '@kbn/content-list-provider';
import { ContentListProvider, isPaginationConfig } from '@kbn/content-list-provider';
import { SAVED_OBJECTS_PER_PAGE_ID } from '@kbn/management-settings-ids';
import type { TableListViewFindItemsFn, ContentListClientServices } from './types';
import { createFindItemsFn } from './strategy';

/**
 * Props for the Client provider.
 *
 * This provider wraps an existing `TableListView`-style `findItems` function and handles
 * client-side sorting, filtering, and pagination.
 */
export type ContentListClientProviderProps = ContentListCoreConfig & {
  children?: ReactNode;
  /**
   * The consumer's existing `findItems` function (same signature as `TableListView`).
   */
  findItems: TableListViewFindItemsFn;
  /**
   * Feature configuration for enabling/customizing capabilities.
   */
  features?: ContentListFeatures;
  /**
   * Services required by the client provider.
   *
   * `uiSettings` is mandatory — used to read `savedObjects:perPage` for the default page size.
   */
  services: ContentListClientServices;
};

/**
 * Client-side content list provider.
 *
 * Wraps an existing `TableListView`-style `findItems` function and provides
 * client-side sorting, filtering, and pagination. The strategy handles transformation
 * of `UserContentCommonSchema` items to `ContentListItem` format.
 *
 * The `services.uiSettings` is read once at mount to determine the default page size
 * from the `savedObjects:perPage` user setting. An explicit
 * `features.pagination.initialPageSize` takes priority over the uiSettings value.
 *
 * @example
 * ```tsx
 * <ContentListClientProvider
 *   id="my-dashboards"
 *   labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
 *   findItems={myExistingFindItems}
 *   services={{ uiSettings: core.uiSettings }}
 * >
 *   <MyContentList />
 * </ContentListClientProvider>
 * ```
 */
export const ContentListClientProvider = ({
  children,
  findItems: tableListViewFindItems,
  features,
  services,
  ...rest
}: ContentListClientProviderProps): JSX.Element => {
  // Create the adapted findItems function (includes transformation).
  const findItems = useMemo(
    () => createFindItemsFn(tableListViewFindItems),
    [tableListViewFindItems]
  );

  // Build the dataSource config. No transform needed - strategy handles it.
  const dataSource: DataSourceConfig = useMemo(() => ({ findItems }), [findItems]);

  // Read page size from uiSettings once at mount. Not reactive — page size
  // setting changes during a session are not expected to take effect until reload.
  const [uiSettingsPageSize] = useState(() =>
    services.uiSettings.get<number>(SAVED_OBJECTS_PER_PAGE_ID)
  );

  // Merge: explicit pagination: false > explicit initialPageSize > uiSettings > base default.
  const resolvedFeatures = useMemo(() => {
    const { pagination } = features ?? {};

    // Respect explicit disablement — don't re-enable by writing a config object.
    if (pagination === false) {
      return features;
    }

    // Consumer explicitly set a page size — don't override.
    if (isPaginationConfig(pagination) && typeof pagination.initialPageSize === 'number') {
      return features;
    }

    return {
      ...features,
      pagination: {
        ...(isPaginationConfig(pagination) ? pagination : {}),
        initialPageSize: uiSettingsPageSize,
      },
    };
  }, [features, uiSettingsPageSize]);

  return (
    <ContentListProvider
      dataSource={dataSource}
      features={resolvedFeatures}
      services={services}
      {...rest}
    >
      {children}
    </ContentListProvider>
  );
};
