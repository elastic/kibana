/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiHealth, useEuiTheme, type EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart, CoreStart, HttpStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
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
import { getResourcePreviewHref } from '../get_resource_preview_href';
import { loadDataManagementResources } from '../load_resources';
import {
  healthColors,
  healthFieldDefinition,
  healthLabels,
  matchesHealthFilter,
  readHealthFilter,
} from './resource_health';
import { ResourceStatsPanel } from './resource_stats_panel';
import { ResourceRowActions } from '../resource_row_actions';
import type { ResourceStats } from '../resource_stats';
import { resolveResourceKind, type DataManagementResource } from '../sample_resources';
import {
  LoadedResourcesContext,
  TYPE_FILTER_FIELD,
  TypeFilter,
  typeFieldDefinition,
} from '../type_filter';

const { Column } = ContentListTable;

const nameColumnTitle = i18n.translate('management.dataManagementOverview.v2.column.name', {
  defaultMessage: 'Name',
});

const typeColumnTitle = i18n.translate('management.dataManagementOverview.v2.column.type', {
  defaultMessage: 'Type',
});

const healthColumnTitle = i18n.translate('management.dataManagementOverview.v2.column.health', {
  defaultMessage: 'Health',
});

const actionsColumnTitle = i18n.translate('management.dataManagementOverview.v2.column.actions', {
  defaultMessage: 'Actions',
});

/**
 * Pin the custom Actions column to the inline end of the scrollport.
 *
 * `EuiBasicTable` only applies `position: sticky` for its built-in actions
 * column (`column.actions`). This table renders Actions as a normal field
 * column, so the header and cells otherwise scroll away with the row.
 * The header test subject is EUI's `tableHeaderCell_${field}_${index}`.
 */
const stickyActionsColumnCss = (euiTheme: EuiThemeComputed) => css`
    th[data-test-subj^='tableHeaderCell_actions_'] .euiTableCellContent,
  td[data-test-subj='dataManagementOverviewActionsColumn'] .euiTableCellContent {
    justify-content: flex-end;
  }

  th[data-test-subj^='tableHeaderCell_actions_'],
  td[data-test-subj='dataManagementOverviewActionsColumn'] {
    position: sticky;
    inset-inline-end: 0;
    background-color: var(
      --euiTableCellStickyBackgroundColor,
      ${euiTheme.colors.backgroundBasePlain}
    );

    @container EuiTable scroll-state(scrollable: right) {
      &::before {
        content: '';
        position: absolute;
        inset-inline-start: 0;
        inset-block: 0;
        inline-size: ${euiTheme.border.width.thin};
        background-color: ${euiTheme.border.color};
      }
    }
  }
`;

const tableTitle = i18n.translate('management.dataManagementOverview.v2.tableTitle', {
  defaultMessage: 'Data resources',
});

const labels = {
  entity: i18n.translate('management.dataManagementOverview.v2.entity', {
    defaultMessage: 'resource',
  }),
  entityPlural: i18n.translate('management.dataManagementOverview.v2.entityPlural', {
    defaultMessage: 'resources',
  }),
  searchPlaceholder: i18n.translate('management.dataManagementOverview.v2.searchPlaceholder', {
    defaultMessage: 'Search',
  }),
};

const features = {
  sorting: {
    initialSort: { field: 'title', direction: 'asc' as const },
    fields: [
      { field: 'title', name: nameColumnTitle },
      { field: 'type', name: typeColumnTitle },
      { field: 'health', name: healthColumnTitle },
    ],
  },
  pagination: { initialPageSize: 25 },
  selection: false as const,
  search: true,
  fields: [typeFieldDefinition, healthFieldDefinition],
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

const sortValue = (resource: DataManagementResource, field: string): string => {
  if (field === 'health') {
    return resource.health ?? '';
  }
  if (field === 'type') {
    return resource.type;
  }
  return resource.title;
};

const isResource = (item: ContentListItem): item is DataManagementResource =>
  item.kind === 'index' ||
  item.kind === 'dataStream' ||
  item.kind === 'esqlView' ||
  item.kind === 'dataset' ||
  item.kind === 'stream' ||
  item.kind === 'lookup' ||
  item.kind === 'vector';

export const ResourcesTable = ({
  getUrlForApp,
  http,
  share,
  toasts,
  onEditEsqlView,
}: {
  getUrlForApp: ApplicationStart['getUrlForApp'];
  http: HttpStart;
  share: SharePluginStart;
  toasts: CoreStart['notifications']['toasts'];
  onEditEsqlView: (name: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const resourcesPromise = useMemo(() => loadDataManagementResources(http), [http]);
  const resourcesRequest = useRef(resourcesPromise.then((loaded) => loaded.resources));
  const [resources, setResources] = useState<readonly DataManagementResource[]>([]);
  const [stats, setStats] = useState<ResourceStats | undefined>();
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    resourcesRequest.current = resourcesPromise.then((loaded) => loaded.resources);
    let cancelled = false;
    resourcesPromise.then((loaded) => {
      if (!cancelled) {
        setResources(loaded.resources);
        setStats(loaded.stats);
        setStatsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [resourcesPromise]);

  const dataSource = useMemo<DataSourceConfig>(
    () => ({
      debounceMs: 0,
      onRefresh: async () => {
        const next = loadDataManagementResources(http);
        resourcesRequest.current = next.then((loaded) => loaded.resources);
        const loaded = await next;
        setResources(loaded.resources);
        setStats(loaded.stats);
        setStatsLoading(false);
      },
      findItems: async ({ searchQuery, filters, sort, page }) => {
        const loaded = await resourcesRequest.current;
        const { include, exclude } = readTypeFilter(filters);
        const healthFilter = readHealthFilter(filters);
        const direction = sort?.direction === 'desc' ? -1 : 1;
        const field = sort?.field === 'type' || sort?.field === 'health' ? sort.field : 'title';
        const sorted = loaded
          .filter((resource) => {
            if (!matchesSearch(resource.title, searchQuery)) {
              return false;
            }
            if (include.length > 0 && !include.includes(resource.kind)) {
              return false;
            }
            if (exclude.includes(resource.kind)) {
              return false;
            }
            return matchesHealthFilter(resource.health, healthFilter);
          })
          .sort(
            (left, right) =>
              sortValue(left, field).localeCompare(sortValue(right, field)) * direction
          );
        const start = page.index * page.size;

        return {
          items: sorted.slice(start, start + page.size),
          total: sorted.length,
        };
      },
    }),
    [http]
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
        id="data-management-overview-v2"
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
          <ResourceStatsPanel isLoading={statsLoading} stats={stats} />
          <div css={stickyActionsColumnCss(euiTheme)}>
            <ContentListTable tableLayout="fixed" title={tableTitle}>
              <Column.Name
                columnTitle={nameColumnTitle}
                maxWidth="24em"
                showDescription={false}
                width="24em"
              />
              <Column
                data-test-subj="dataManagementOverviewHealthColumn"
                id="health"
                name={healthColumnTitle}
                render={(item) =>
                  isResource(item) && item.health ? (
                    <EuiHealth
                      color={healthColors[item.health]}
                      data-test-subj="dataManagementOverviewHealthCell"
                    >
                      {healthLabels[item.health]}
                    </EuiHealth>
                  ) : null
                }
                sortable
                width="10em"
              />
              <Column
                data-test-subj="dataManagementOverviewTypeColumn"
                id="type"
                name={typeColumnTitle}
                render={(item) =>
                  isResource(item) ? (
                    <EuiBadge color="hollow" data-test-subj="dataManagementOverviewTypeBadge">
                      {item.type}
                    </EuiBadge>
                  ) : undefined
                }
                sortable
                width="16em"
              />
              <Column
                data-test-subj="dataManagementOverviewActionsColumn"
                id="actions"
                name={actionsColumnTitle}
                render={(item) =>
                  isResource(item) ? (
                    <ResourceRowActions
                      getUrlForApp={getUrlForApp}
                      http={http}
                      onEditEsqlView={onEditEsqlView}
                      resource={item}
                      share={share}
                      toasts={toasts}
                    />
                  ) : null
                }
              />
            </ContentListTable>
          </div>
          <ContentListFooter />
        </ContentList>
      </ContentListProvider>
    </LoadedResourcesContext.Provider>
  );
};
