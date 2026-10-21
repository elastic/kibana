/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core/public';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  type ContentListItem,
  type DataSourceConfig,
} from '@kbn/content-list';
import { getResourcePreviewHref } from './get_resource_preview_href';
import { MOCK_RESOURCES, type DataManagementResource } from './mock_resources';

const { Column } = ContentListTable;

const nameColumnTitle = i18n.translate('management.dataManagementOverview.column.name', {
  defaultMessage: 'Name',
});

const typeColumnTitle = i18n.translate('management.dataManagementOverview.column.type', {
  defaultMessage: 'Type',
});

const tableTitle = i18n.translate('management.dataManagementOverview.tableTitle', {
  defaultMessage: 'Data resources',
});

const labels = {
  entity: i18n.translate('management.dataManagementOverview.entity', {
    defaultMessage: 'resource',
  }),
  entityPlural: i18n.translate('management.dataManagementOverview.entityPlural', {
    defaultMessage: 'resources',
  }),
};

const features = {
  sorting: {
    initialSort: { field: 'title', direction: 'asc' as const },
    fields: [
      { field: 'title', name: nameColumnTitle },
      { field: 'type', name: typeColumnTitle },
    ],
  },
  pagination: { initialPageSize: 25 },
  selection: false as const,
  search: false,
  urlSync: false,
};

const isResource = (item: ContentListItem): item is DataManagementResource =>
  item.kind === 'index' ||
  item.kind === 'dataStream' ||
  item.kind === 'esqlView' ||
  item.kind === 'dataset' ||
  item.kind === 'stream';

export const ResourcesTable = ({
  getUrlForApp,
}: {
  getUrlForApp: ApplicationStart['getUrlForApp'];
}) => {
  const dataSource = useMemo<DataSourceConfig>(
    () => ({
      debounceMs: 0,
      findItems: async ({ sort, page }) => {
        const direction = sort?.direction === 'desc' ? -1 : 1;
        const field = sort?.field === 'type' ? 'type' : 'title';
        const sorted = [...MOCK_RESOURCES].sort(
          (left, right) => left[field].localeCompare(right[field]) * direction
        );
        const start = page.index * page.size;

        return {
          items: sorted.slice(start, start + page.size),
          total: sorted.length,
        };
      },
    }),
    []
  );
  const itemConfig = useMemo(
    () => ({
      getHref: (resource: ContentListItem) =>
        isResource(resource) ? getResourcePreviewHref(getUrlForApp, resource) : '',
    }),
    [getUrlForApp]
  );

  return (
    <ContentListProvider
      id="data-management-overview"
      dataSource={dataSource}
      features={features}
      item={itemConfig}
      labels={labels}
    >
      <ContentList data-test-subj="dataManagementOverviewTable">
        <ContentListTable title={tableTitle}>
          <Column.Name columnTitle={nameColumnTitle} showDescription={false} />
          <Column
            data-test-subj="dataManagementOverviewTypeColumn"
            id="type"
            name={typeColumnTitle}
            render={(item) => (isResource(item) ? item.type : undefined)}
            sortable
            width="16em"
          />
        </ContentListTable>
        <ContentListFooter />
      </ContentList>
    </ContentListProvider>
  );
};
