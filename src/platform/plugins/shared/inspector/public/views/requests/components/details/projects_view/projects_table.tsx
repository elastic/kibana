/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Criteria } from '@elastic/eui';
import {
  Comparators,
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { getSolutionIcon } from '@kbn/cps-utils';
import { ClusterView } from '../clusters_view/clusters_table/cluster_view';
import { ClusterHealth, type ClusterHealthStatus } from '../clusters_view/clusters_health';
import type { ProjectClusterItem } from './join_clusters_to_projects';

function getInitialExpandedRow(items: ProjectClusterItem[]) {
  return items.length === 1
    ? { [items[0].key]: <ClusterView clusterDetails={items[0].clusterDetails} /> }
    : {};
}

interface Props {
  items: ProjectClusterItem[];
}

export function ProjectsTable({ items }: Props) {
  const [expandedRows, setExpandedRows] = useState<Record<string, ReactNode>>(
    getInitialExpandedRow(items)
  );
  const [sortField, setSortField] = useState<undefined | keyof ProjectClusterItem>();
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleDetails = useCallback((item: ProjectClusterItem) => {
    setExpandedRows((prevExpandedRows) => {
      const nextExpandedRows = { ...prevExpandedRows };
      if (item.key in nextExpandedRows) {
        delete nextExpandedRows[item.key];
      } else {
        nextExpandedRows[item.key] = <ClusterView clusterDetails={item.clusterDetails} />;
      }
      return nextExpandedRows;
    });
  }, []);

  const columns: Array<EuiBasicTableColumn<ProjectClusterItem>> = [
    {
      field: 'name',
      name: i18n.translate('inspector.requests.projects.table.nameLabel', {
        defaultMessage: 'Project alias',
      }),
      render: (name: string, item: ProjectClusterItem) => {
        const label =
          item.key in expandedRows
            ? i18n.translate('inspector.requests.projects.table.collapseRow', {
                defaultMessage: 'Collapse table row to hide project details',
              })
            : i18n.translate('inspector.requests.projects.table.expandRow', {
                defaultMessage: 'Expand table row to view project details',
              });
        return (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={label} disableScreenReaderOutput>
                <EuiButtonIcon
                  data-test-subj={`inspectorRequestToggleProjectDetails${item.key}`}
                  onClick={() => toggleDetails(item)}
                  aria-label={label}
                  iconType={item.key in expandedRows ? 'chevronSingleDown' : 'chevronSingleRight'}
                />
              </EuiToolTip>
            </EuiFlexItem>
            {item.project ? (
              <EuiFlexItem grow={false}>
                <EuiIcon type={getSolutionIcon(item.project._type)} size="m" aria-hidden={true} />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {name}
              </EuiText>
            </EuiFlexItem>
            {item.isOrigin ? (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="flag"
                  content={i18n.translate('inspector.requests.projects.table.originProjectLabel', {
                    defaultMessage: 'Origin project',
                  })}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        );
      },
      sortable: items.length > 1,
      width: '30%',
    },
    {
      field: 'status',
      name: i18n.translate('inspector.requests.projects.table.statusLabel', {
        defaultMessage: 'Last status',
      }),
      render: (status: ClusterHealthStatus) => {
        return <ClusterHealth status={status} />;
      },
      sortable: items.length > 1,
    },
    {
      align: 'right' as const,
      field: 'responseTime',
      name: i18n.translate('inspector.requests.projects.table.responseTimeLabel', {
        defaultMessage: 'Response time',
      }),
      render: (responseTime: number | undefined) => (
        <EuiText size="xs" color="subdued">
          {responseTime
            ? i18n.translate('inspector.requests.projects.table.responseTimeInMilliseconds', {
                defaultMessage: '{responseTime}ms',
                values: { responseTime },
              })
            : null}
        </EuiText>
      ),
      sortable: items.length > 1,
    },
    {
      field: 'provider',
      name: i18n.translate('inspector.requests.projects.table.providerLabel', {
        defaultMessage: 'Provider',
      }),
      render: (provider: string | undefined) => (
        <EuiText size="xs" color="subdued">
          {provider ?? null}
        </EuiText>
      ),
      sortable: items.length > 1,
    },
    {
      field: 'region',
      name: i18n.translate('inspector.requests.projects.table.regionLabel', {
        defaultMessage: 'Region',
      }),
      render: (region: string | undefined) => (
        <EuiText size="xs" color="subdued">
          {region ?? null}
        </EuiText>
      ),
      sortable: items.length > 1,
    },
    {
      align: 'right' as const,
      field: 'tags',
      name: i18n.translate('inspector.requests.projects.table.tagsLabel', {
        defaultMessage: 'Tags',
      }),
      render: (tags: string[]) =>
        tags.length > 0 ? (
          <EuiBadge
            iconType="tag"
            color="hollow"
            aria-label={i18n.translate('inspector.requests.projects.table.tagsBadgeAriaLabel', {
              defaultMessage: '{count} {count, plural, one {tag} other {tags}}: {tags}',
              values: { count: tags.length, tags: tags.join(', ') },
            })}
          >
            {tags.length}
          </EuiBadge>
        ) : null,
    },
  ];

  return (
    <EuiBasicTable
      tableCaption={i18n.translate('inspector.requests.projects.table.caption', {
        defaultMessage: 'Project details',
      })}
      items={
        sortField
          ? [...items].sort(Comparators.property(sortField, Comparators.default(sortDirection)))
          : items
      }
      itemIdToExpandedRowMap={expandedRows}
      itemId="key"
      columns={columns}
      sorting={{
        sort: sortField
          ? {
              field: sortField,
              direction: sortDirection,
            }
          : undefined,
      }}
      onChange={({ sort }: Criteria<ProjectClusterItem>) => {
        if (sort) {
          setSortField(sort.field);
          setSortDirection(sort.direction);
        }
      }}
      noItemsMessage={i18n.translate('inspector.requests.projects.table.noItemsFound', {
        defaultMessage: 'No projects found',
      })}
      cellProps={(item, column) => ({
        'data-test-subj': `inspectorRequestProjectsTableCell-${column.name}-${item.key}`,
      })}
    />
  );
}
