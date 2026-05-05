/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type {
  TableListTab,
  TableListTabParentProps,
} from '@kbn/content-management-tabbed-table-list-view';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

const noopOnFetchSuccess: TableListTabParentProps['onFetchSuccess'] = () => undefined;
const noopSetPageDataTestSubject: TableListTabParentProps['setPageDataTestSubject'] = () =>
  undefined;

export interface ExternalTabProps {
  /** A `TableListTab` registered via the dashboard plugin's `getTabs` extension point. */
  tab: TableListTab<UserContentCommonSchema>;
}

/**
 * Renders a tab passed in via the `getTabs` prop (e.g. visualizations,
 * annotation groups). External tabs continue to expose a legacy
 * `getTableList(parentProps)` function that resolves to a React node
 * (typically a `TableListViewTable`); we resolve it lazily here.
 *
 * We forward only `onFetchSuccess` and `setPageDataTestSubject` (as noops);
 * `getBreadcrumbs` is intentionally omitted because no current consumer
 * reads it — the dashboard route's chrome already handles breadcrumbs.
 */
export const ExternalTab = ({ tab }: ExternalTabProps) => {
  const [content, setContent] = useState<React.ReactNode>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const node = await tab.getTableList({
        onFetchSuccess: noopOnFetchSuccess,
        setPageDataTestSubject: noopSetPageDataTestSubject,
      });
      if (!cancelled) {
        setContent(node);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return <>{content}</>;
};
