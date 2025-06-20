/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useState } from 'react';
import {
  formatDate,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTableFieldDataColumnType,
  EuiLink,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { ChromeRecentlyAccessedHistoryItem } from '@kbn/core-chrome-browser';
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
  const [pageSize, setPageSize] = useState(5);
  console.log('recentlyAccessed', recentlyAccessed);
  const items: ChromeRecentlyAccessedHistoryItem[] =
    recentlyAccessed?.map((recentlyAccessed: any) => {
      return {
        id: recentlyAccessed.id,
        label: recentlyAccessed.label,
        link: recentlyAccessed.link,
        lastAccessed: recentlyAccessed.lastAccessed,
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
      sortable: true,
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
  const pageSizeOptions = [5, 10, 20, 50];

  const onTableChange = ({ page }: { page: { index: number; size: number } }) => {
    if (page) {
      const { index: pageIndex, size: pageSize } = page;
      setPageIndex(pageIndex);
      setPageSize(pageSize);
    }
  };

  // Manually handle pagination of data
  const findRecentlyViewed = (
    dashboard: ChromeRecentlyAccessedHistoryItem[],
    pageIndex: number,
    pageSize: number
  ) => {
    console.log('dashboard', dashboard);
    let pageOfItems;

    if (!pageIndex && !pageSize) {
      pageOfItems = dashboard;
    } else {
      const startIndex = pageIndex * pageSize;
      pageOfItems = dashboard.slice(startIndex, Math.min(startIndex + pageSize, dashboard.length));
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
  const resultsCount =
    pageSize === 0 ? (
      <strong>All</strong>
    ) : (
      <>
        <strong>
          {pageSize * pageIndex + 1}-{pageSize * pageIndex + pageSize}
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
        <EuiBasicTable
          tableCaption={i18n.translate('home.recentlyViewedTable.caption', {
            defaultMessage: 'Recently viewed dashboards',
          })}
          responsiveBreakpoint={false}
          items={pageOfItems}
          rowHeader="name"
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
