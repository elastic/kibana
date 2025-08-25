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
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiInMemoryTable,
  EuiLink,
  EuiButton,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { useFavorites } from '@kbn/content-management-favorites-public';

interface FavoriteDashboards {
  dashboards: any[];
  addBasePath: (path: string) => string;
}

export const HomeFavoriteDashboards = ({ dashboards, addBasePath }: FavoriteDashboards) => {
  const { data } = useFavorites();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const favoriteIds: string[] = data?.favoriteIds ?? [];
  const favoriteDashboards = dashboards.filter((dashboard) => favoriteIds.includes(dashboard.id));

  const items = favoriteDashboards.map((dashboard) => ({
    id: dashboard.id,
    title: dashboard.attributes.title,
    description: dashboard.attributes.description,
  }));

  const columns = [
    {
      field: 'title',
      name: i18n.translate('home.dashboardsCreatedByMe.titleColumn', {
        defaultMessage: 'Title',
      }),
      render: (title: string, item: any) => (
        <EuiLink href={addBasePath(`/app/dashboards#/view/${item.id}`)}>{title}</EuiLink>
      ),
    },
    {
      field: 'description',
      name: i18n.translate('home.dashboardsCreatedByMe.descriptionColumn', {
        defaultMessage: 'Description',
      }),
      render: (description: string) => description || '-',
    },
  ];

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
              {i18n.translate('home.favoriteDashboards.emptyTitle', {
                defaultMessage: "You don't have any favorite dashboards yet",
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <p>
              {i18n.translate('home.favoriteDashboards.emptyDescription', {
                defaultMessage:
                  'To add dashboards to your favorites, open the dashboards list and mark your favorites.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            fill
            href={addBasePath('/app/dashboards#/list')}
            data-test-subj="seeDashboardsListButton"
          >
            {i18n.translate('home.favoriteDashboards.seeDashboardsListButton', {
              defaultMessage: 'See all dashboards',
            })}
          </EuiButton>
        </div>
      ) : (
        <>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('home.favoriteDashboards.title', {
                defaultMessage: 'Favorite Dashboards',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText size="xs">Showing {resultsCount}</EuiText>
          <EuiInMemoryTable
            tableCaption={i18n.translate('home.favoriteDashboards.caption', {
              defaultMessage: 'Favorite Dashboards',
            })}
            responsiveBreakpoint={false}
            items={items}
            columns={columns}
            rowHeader="title"
            pagination={pagination}
            onChange={onTableChange}
          />
        </>
      )}
    </EuiPanel>
  );
};
