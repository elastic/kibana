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

interface DashboardsCreatedByUserProps {
  dashboards: any[];
  addBasePath: (path: string) => string;
}

export const PersonalizedDashboardsCreatedByUser = ({
  dashboards,
  addBasePath,
}: DashboardsCreatedByUserProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const items = dashboards.map((dashboard) => ({
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
              {i18n.translate('home.dashboardsCreatedByMe.emptyTitle', {
                defaultMessage: "You haven't created any dashboards yet",
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <p>
              {i18n.translate('home.dashboardsCreatedByMe.emptyDescription', {
                defaultMessage: 'To get started, create a new dashboard to visualize your data.',
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
            {i18n.translate('home.dashboardsCreatedByMe.createDashboardButton', {
              defaultMessage: 'Create a dashboard',
            })}
          </EuiButton>
        </div>
      ) : (
        <>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('home.dashboardsCreatedByMe.title', {
                defaultMessage: 'Dashboards created by me',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText size="xs">Showing {resultsCount}</EuiText>
          <EuiInMemoryTable
            tableCaption={i18n.translate('home.dashboardsCreatedByMe.caption', {
              defaultMessage: 'Dashboards created by me',
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
