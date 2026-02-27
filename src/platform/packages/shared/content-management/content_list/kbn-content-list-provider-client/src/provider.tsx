/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type ReactNode } from 'react';
import type {
  ContentListCoreConfig,
  ContentListFeatures,
  DataSourceConfig,
} from '@kbn/content-list-provider';
import { ContentListProvider } from '@kbn/content-list-provider';
import type { TableListViewFindItemsFn } from './types';
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
};

/**
 * Client-side content list provider.
 *
 * Wraps an existing `TableListView`-style `findItems` function and provides
 * client-side sorting, filtering, and pagination. The strategy handles transformation
 * of `UserContentCommonSchema` items to `ContentListItem` format.
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
export const ContentListClientProvider = ({
  children,
  findItems: tableListViewFindItems,
  ...rest
}: ContentListClientProviderProps): JSX.Element => {
  // Create the adapted findItems function (includes transformation).
  const findItems = useMemo(
    () => createFindItemsFn(tableListViewFindItems),
    [tableListViewFindItems]
  );

  // Build the dataSource config. No transform needed - strategy handles it.
  const dataSource: DataSourceConfig = useMemo(() => ({ findItems }), [findItems]);

  return (
    <ContentListProvider dataSource={dataSource} {...rest}>
      {children}
    </ContentListProvider>
  );
};
