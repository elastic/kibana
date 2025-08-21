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
  EuiLoadingSpinner,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiHorizontalRule,
  EuiBasicTable,
  EuiLink,
} from '@elastic/eui';
import type { EuiPanelProps, EuiBasicTableProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFavoritesPanel } from './hooks';
import { getServices } from '../kibana_services';

interface FavoritesPanelProps
  extends Pick<
    EuiPanelProps,
    'color' | 'hasBorder' | 'hasShadow' | 'paddingSize' | 'borderRadius' | 'css'
  > {
  maxWidth?: number;
  hideTitle?: boolean;
}

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
  color = 'plain',
  hasBorder = true,
  hasShadow = false,
  paddingSize = 'm',
  borderRadius,
  css,
  maxWidth,
  hideTitle = false,
}) => {
  const { items, isLoading, error } = useFavoritesPanel();
  const services = getServices();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const handleItemClick = (link: string) => {
    services.application.navigateToUrl(link);
  };

  const columns: EuiBasicTableProps<any>['columns'] = [
    {
      field: 'title',
      name: (
        <FormattedMessage
          id="home.contentPanels.favorites.table.nameHeader"
          defaultMessage="Name"
        />
      ),
      render: (title: string, item: any) => (
        <EuiLink
          onClick={() => handleItemClick(item.link)}
          color="text"
          data-test-subj={`favorites-link-${item.id}`}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={item.type === 'dashboard' ? 'dashboardApp' : 'discoverApp'} size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>{title}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      ),
    },
  ];

  const tableProps: EuiBasicTableProps<any> = {
    items,
    columns,
    ...(items.length > 10 && {
      pagination: {
        ...pagination,
        pageSizeOptions: [10],
        totalItemCount: items.length,
        showPerPageOptions: false,
      },
    }),
    onChange: ({ page }: any) => {
      setPagination(page);
    },
    tableLayout: 'auto',
    'data-test-subj': 'favoritesTable',
  };

  const renderPanelContent = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <EuiLoadingSpinner size="m" />
        </div>
      );
    }

    if (error) {
      return (
        <EuiText color="danger" size="s">
          <FormattedMessage
            id="home.contentPanels.favorites.error"
            defaultMessage="Error loading favorites: {errorMessage}"
            values={{ errorMessage: error.message }}
          />
        </EuiText>
      );
    }

    if (items.length === 0) {
      return (
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="home.contentPanels.favorites.empty"
            defaultMessage="Your favorited items will appear here"
          />
        </EuiText>
      );
    }

    return <EuiBasicTable {...tableProps} />;
  };

  return (
    <EuiPanel
      color={color}
      hasBorder={hasBorder}
      hasShadow={hasShadow}
      paddingSize={paddingSize}
      borderRadius={borderRadius}
      css={css}
      style={{ maxWidth: maxWidth ? `${maxWidth}px` : undefined }}
      data-test-subj="homeFavoritesPanel"
    >
      {!hideTitle && (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="starEmpty" size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>
                  <FormattedMessage
                    id="home.contentPanels.favorites.title"
                    defaultMessage="Favorites"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="s" />
        </>
      )}
      {renderPanelContent()}
    </EuiPanel>
  );
};
