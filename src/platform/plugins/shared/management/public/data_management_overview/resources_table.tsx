/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
  type ContentListItem,
  type DataSourceConfig,
  type FindItemsParams,
} from '@kbn/content-list';
import { getResourcePreviewHref } from './get_resource_preview_href';
import { loadDataManagementResources } from './load_resources';
import { resolveResourceKind, type DataManagementResource } from './sample_resources';
import {
  LoadedResourcesContext,
  TYPE_FILTER_FIELD,
  TypeFilter,
  typeFieldDefinition,
} from './type_filter';

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
  searchPlaceholder: i18n.translate('management.dataManagementOverview.searchPlaceholder', {
    defaultMessage: 'Search',
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
  search: true,
  fields: [typeFieldDefinition],
  urlSync: false,
};

const matchesSearch = (title: string, searchQuery: string): boolean => {
  const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }
  const name = title.toLowerCase();
  return terms.every((term) => name.includes(term));
};

const readTypeFilter = (
  filters: FindItemsParams['filters']
): { include: string[]; exclude: string[] } => {
  const value = filters[TYPE_FILTER_FIELD];
  if (value == null || typeof value !== 'object' || !('include' in value || 'exclude' in value)) {
    return { include: [], exclude: [] };
  }

  const include = 'include' in value && Array.isArray(value.include) ? value.include : [];
  const exclude = 'exclude' in value && Array.isArray(value.exclude) ? value.exclude : [];
  return {
    include: include.map((entry) => resolveResourceKind(entry) ?? entry),
    exclude: exclude.map((entry) => resolveResourceKind(entry) ?? entry),
  };
};

const isResource = (item: ContentListItem): item is DataManagementResource =>
  item.kind === 'index' ||
  item.kind === 'dataStream' ||
  item.kind === 'esqlView' ||
  item.kind === 'dataset' ||
  item.kind === 'stream';

export const ResourcesTable = ({
  getUrlForApp,
  http,
}: {
  getUrlForApp: ApplicationStart['getUrlForApp'];
  http: HttpStart;
}) => {
  const resourcesPromise = useMemo(() => loadDataManagementResources(http), [http]);
  const [resources, setResources] = useState<readonly DataManagementResource[]>([]);

  useEffect(() => {
    let cancelled = false;
    resourcesPromise.then((loaded) => {
      if (!cancelled) {
        setResources(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [resourcesPromise]);

  const dataSource = useMemo<DataSourceConfig>(
    () => ({
      debounceMs: 0,
      findItems: async ({ searchQuery, filters, sort, page }) => {
        const loaded = await resourcesPromise;
        const { include, exclude } = readTypeFilter(filters);
        const direction = sort?.direction === 'desc' ? -1 : 1;
        const field = sort?.field === 'type' ? 'type' : 'title';
        const sorted = loaded
          .filter((resource) => {
            if (!matchesSearch(resource.title, searchQuery)) {
              return false;
            }
            if (include.length > 0 && !include.includes(resource.kind)) {
              return false;
            }
            return !exclude.includes(resource.kind);
          })
          .sort((left, right) => left[field].localeCompare(right[field]) * direction);
        const start = page.index * page.size;

        return {
          items: sorted.slice(start, start + page.size),
          total: sorted.length,
        };
      },
    }),
    [resourcesPromise]
  );
  const itemConfig = useMemo(
    () => ({
      getHref: (resource: ContentListItem) =>
        isResource(resource) ? getResourcePreviewHref(getUrlForApp, resource) : '',
    }),
    [getUrlForApp]
  );

  return (
    <LoadedResourcesContext.Provider value={resources}>
      <ContentListProvider
        id="data-management-overview"
        dataSource={dataSource}
        features={features}
        item={itemConfig}
        labels={labels}
      >
        <ContentList data-test-subj="dataManagementOverviewTable">
          <ContentListToolbar data-test-subj="dataManagementOverviewSearch">
            <ContentListToolbar.Filters>
              <TypeFilter />
            </ContentListToolbar.Filters>
          </ContentListToolbar>
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
    </LoadedResourcesContext.Provider>
  );
};
