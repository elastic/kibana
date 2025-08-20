/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useState } from 'react';
import type { EuiBasicTableColumn, EuiTableFieldDataColumnType } from '@elastic/eui';
import {
  formatDate,
  EuiLink,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiInMemoryTable,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { ChromeRecentlyAccessedHistoryItem } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

interface RecentlyAccessedTableProps {
  recentlyAccessed?: ChromeRecentlyAccessedHistoryItem[];
  addBasePath: (path: string) => string;
}

export const PersonalizedRecentlyViewed = ({
  recentlyAccessed,
  addBasePath,
}: RecentlyAccessedTableProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const items: ChromeRecentlyAccessedHistoryItem[] =
    recentlyAccessed?.map((dashboard: ChromeRecentlyAccessedHistoryItem) => {
      return {
        id: dashboard.id,
        label: dashboard.label,
        link: dashboard.link,
        lastAccessed: dashboard.lastAccessed,
      };
    }) ?? [];

  const columns: Array<EuiBasicTableColumn<ChromeRecentlyAccessedHistoryItem>> = [
    {
      field: 'label',
      name: 'Name',
      'data-test-subj': 'nameCell',

      render: (label, item) => <EuiLink href={addBasePath(item.link)}>{label}</EuiLink>,
    },
    {
      field: 'lastAccessed',
      name: 'Last Viewed',
      'data-test-subj': 'lastAccessedCell',
      render: (lastAccessed: number | undefined) => {
        if (!lastAccessed) return '-';
        return formatDate(lastAccessed, 'D MMM YYYY');
      },
      sortable: true, // how does it work?
    },
  ];

  const getRowProps = (personalDashboards: ChromeRecentlyAccessedHistoryItem) => {
    const { id } = personalDashboards;
    return {
      'data-test-subj': `row-${id}`,
      className: 'customRowClass',
      onClick: () => {},
    };
  };

  const getCellProps = (
    personalDashboards: ChromeRecentlyAccessedHistoryItem,
    column: EuiTableFieldDataColumnType<ChromeRecentlyAccessedHistoryItem>
  ) => {
    const { id } = personalDashboards;
    const { field } = column;
    return {
      className: 'customCellClass',
      'data-test-subj': `cell-${id}-${String(field)}`,
      textOnly: true,
    };
  };
  const pageSizeOptions = [2, 5, 10, 20, 50];

  const onTableChange = ({ page }: { page: { index: number; size: number } }) => {
    if (page) {
      const { index, size } = page;
      setPageIndex(index);
      setPageSize(size);
    }
  };

  // Manually handle pagination of data
  const findRecentlyViewed = (
    dashboard: ChromeRecentlyAccessedHistoryItem[],
    index: number,
    size: number
  ) => {
    let pageOfItems;

    if (!index && !size) {
      pageOfItems = dashboard;
    } else {
      const startIndex = index * size;
      pageOfItems = dashboard.slice(startIndex, Math.min(startIndex + size, dashboard.length));
    }

    return {
      pageOfItems,
      totalItemCount: dashboard.length,
    };
  };
  const { pageOfItems, totalItemCount } = findRecentlyViewed(items, pageIndex, pageSize);
  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions,
  };
  const isLastPage = pageSize * (pageIndex + 1) >= totalItemCount;
  const resultsCount =
    totalItemCount < pageSize && pageSize ? (
      <strong>All</strong>
    ) : (
      <>
        <strong>
          {pageSize * pageIndex + 1}
          {!isLastPage && <>-{pageSize * pageIndex + pageSize}</>}
        </strong>{' '}
        of {totalItemCount}
      </>
    );
  return (
    <KibanaPageTemplate.Section
      bottomBorder
      paddingSize="xl"
      aria-labelledby="homeSolutions__title"
    >
      <EuiPanel paddingSize="m" style={{ maxWidth: '50%' }}>
        <EuiTitle size="s">
          <h3>
            {i18n.translate('home.recentlyViewedTable.title', {
              defaultMessage: 'Recently viewed',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="xs">Showing {resultsCount}</EuiText>
        <EuiInMemoryTable
          tableCaption={i18n.translate('home.recentlyViewedTable.caption', {
            defaultMessage: 'Recently viewed dashboards',
          })}
          responsiveBreakpoint={false}
          items={items}
          columns={columns}
          rowProps={getRowProps}
          cellProps={getCellProps}
          pagination={pagination}
          onChange={onTableChange}
        />
      </EuiPanel>
    </KibanaPageTemplate.Section>
  );
};
