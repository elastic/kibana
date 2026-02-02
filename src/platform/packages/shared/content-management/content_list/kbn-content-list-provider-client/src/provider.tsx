/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type {
  ContentListCoreConfig,
  ContentListFeatures,
  TransformFunction,
} from '@kbn/content-list-provider';
import { ContentListProvider } from '@kbn/content-list-provider';
import { createFindItemsAdapter, type TableListViewFindItemsFn } from './strategy';

/**
 * Props for the Client provider.
 *
 * This provider wraps an existing `TableListView`-style `findItems` function and handles
 * client-side sorting, filtering, and pagination.
 *
 * @template T The item type from the datasource.
 */
export type ContentListClientProviderProps<T extends UserContentCommonSchema> =
  ContentListCoreConfig & {
    /** Child components that will have access to the content list context. */
    children: ReactNode;

    /**
     * The consumer's existing `findItems` function (same signature as `TableListView`).
     */
    findItems: TableListViewFindItemsFn<T>;

    /**
     * Optional transform function to convert raw items to the expected format.
     */
    transform?: TransformFunction<T>;

    /**
     * Feature configuration for enabling/customizing capabilities.
     */
    features?: ContentListFeatures;
  };

/**
 * Client-side content list provider.
 *
 * Wraps an existing `TableListView`-style `findItems` function and provides
 * client-side sorting, filtering, and pagination.
 *
 * @example
 * ```tsx
 * <ContentListClientProvider
 *   id="my-dashboards"
 *   labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
 *   findItems={myExistingFindItems}
 * >
 *   <MyContentList />
 * </ContentListClientProvider>
 * ```
 */
export const ContentListClientProvider = <T extends UserContentCommonSchema>({
  children,
  findItems: tableListViewFindItems,
  transform,
  features,
  ...coreConfig
}: ContentListClientProviderProps<T>): JSX.Element => {
  // Create the adapter once and memoize it.
  const { findItems, clearCache } = useMemo(
    () => createFindItemsAdapter({ findItems: tableListViewFindItems }),
    [tableListViewFindItems]
  );

  // Build the dataSource config. Transform is optional for UserContentCommonSchema types.
  const dataSource = useMemo(
    () => ({
      findItems,
      clearCache,
      transform,
    }),
    [findItems, clearCache, transform]
  );

  return (
    <ContentListProvider {...{ ...coreConfig, dataSource, features }}>
      {children}
    </ContentListProvider>
  );
};
