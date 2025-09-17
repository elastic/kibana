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
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
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
    recentlyAccessed?.map((dashboard: ChromeRecentlyAccessedHistoryItem) => ({
      id: dashboard.id,
      label: dashboard.label,
      link: dashboard.link,
      lastAccessed: dashboard.lastAccessed,
    })) ?? [];

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
    },
  ];

  const getRowProps = (personalDashboards: ChromeRecentlyAccessedHistoryItem) => ({
    'data-test-subj': `row-${personalDashboards.id}`,
    className: 'customRowClass',
    onClick: () => {},
  });

  const getCellProps = (
    personalDashboards: ChromeRecentlyAccessedHistoryItem,
    column: EuiTableFieldDataColumnType<ChromeRecentlyAccessedHistoryItem>
  ) => ({
    className: 'customCellClass',
    'data-test-subj': `cell-${personalDashboards.id}-${String(column.field)}`,
    textOnly: true,
  });

  const pageSizeOptions = [2, 5, 10, 20, 50];

  const onTableChange = ({ page }: { page: { index: number; size: number } }) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const totalItemCount = items.length;
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

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions,
  };

  const showEmptyState = items.length === 0;

  return (
    <EuiPanel>
      {showEmptyState ? (
        <div style={{ textAlign: 'center' }}>
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('home.recentlyViewedTable.emptyTitle', {
                defaultMessage: 'No items viewed',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <p>
              {i18n.translate('home.recentlyViewedTable.emptyDescription', {
                defaultMessage: 'To get started, view data from existing indices in Discover.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            iconType="plusInCircle"
            fill
            href={addBasePath('/app/dashboards#/create')}
            data-test-subj="createDashboardButton"
          >
            {i18n.translate('home.recentlyViewedTable.createDashboardButton', {
              defaultMessage: 'Create a dashboard',
            })}
          </EuiButton>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            iconType="search"
            href={addBasePath('/app/discover')}
            data-test-subj="searchDataInDiscoverButton"
          >
            {i18n.translate('home.recentlyViewedTable.searchDataInDiscoverButton', {
              defaultMessage: 'Search data in Discover',
            })}
          </EuiButtonEmpty>
        </div>
      ) : (
        <>
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
            rowHeader="label"
            rowProps={getRowProps}
            cellProps={getCellProps}
            pagination={pagination}
            onChange={onTableChange}
          />
        </>
      )}
    </EuiPanel>
  );
};
