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
  EuiIcon,
  EuiTitle,
  EuiLoadingSpinner,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiPanelProps, EuiBasicTableProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type {
  RecentlyAccessedItem,
  RecentlyAccessedFilter,
} from '../hooks/use_recently_accessed_items';

export interface RecentlyAccessedItemsPanelProps {
  items: RecentlyAccessedItem[];
  isLoading: boolean;
  error: Error | null;
  onItemSelect?: (itemId: string, link: string) => void;
  title?: string;
  className?: string;
  'data-test-subj'?: string;
  filter?: RecentlyAccessedFilter;
  maxWidth?: number;
  width?: number;
  hideTitle?: boolean;
  showPanelWrapper?: boolean; // Controls whether to wrap content in EuiPanel
  // EuiPanel props
  color?: EuiPanelProps['color'];
  hasBorder?: EuiPanelProps['hasBorder'];
  hasShadow?: EuiPanelProps['hasShadow'];
  paddingSize?: EuiPanelProps['paddingSize'];
  borderRadius?: EuiPanelProps['borderRadius'];
  css?: EuiPanelProps['css'];
}

export const RecentlyAccessedItemsPanel: React.FC<RecentlyAccessedItemsPanelProps> = ({
  items,
  isLoading,
  error,
  onItemSelect,
  title,
  className,
  'data-test-subj': dataTestSubj,
  filter = 'all',
  maxWidth,
  width,
  hideTitle = false,
  showPanelWrapper = true, // Default to showing panel wrapper
  color = 'subdued',
  hasBorder,
  hasShadow,
  paddingSize = 'm',
  borderRadius,
  css,
}) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const handleItemClick = (itemId: string, link: string) => {
    if (onItemSelect) {
      onItemSelect(itemId, link);
    }
  };

  const getDisplayName = (item: RecentlyAccessedItem) => {
    return item.title;
  };

  const getIconType = (item: RecentlyAccessedItem) => {
    // First try to use the item's type if available
    if (item.type) {
      switch (item.type) {
        case 'discover':
        case 'search':
          return 'discoverApp';
        case 'dashboard':
          return 'dashboardApp';
        case 'visualize':
          return 'visualizeApp';
        case 'maps':
          return 'mapApp';
        case 'canvas':
          return 'canvasApp';
        case 'ml':
          return 'machineLearningApp';
        case 'unknown':
        default:
          // Fall through to URL-based detection
          break;
      }
    }

    // Fallback to filter-based logic
    if (filter === 'discover') {
      return 'discoverApp';
    }
    if (filter === 'dashboard') {
      return 'dashboardApp';
    }

    // Final fallback: try to determine from the link URL
    const link = item.link.toLowerCase();
    if (link.includes('/app/discover') || link.includes('/discover')) {
      return 'discoverApp';
    }
    if (link.includes('/app/dashboard') || link.includes('/dashboards')) {
      return 'dashboardApp';
    }
    if (link.includes('/app/visualize') || link.includes('/visualize')) {
      return 'visualizeApp';
    }
    if (link.includes('/app/maps') || link.includes('/maps')) {
      return 'mapApp';
    }
    if (link.includes('/app/canvas') || link.includes('/canvas')) {
      return 'canvasApp';
    }
    if (link.includes('/app/ml') || link.includes('/machine-learning')) {
      return 'machineLearningApp';
    }

    // Default icon for unknown types
    return 'document';
  };

  const columns: EuiBasicTableProps<any>['columns'] = [
    {
      field: 'title',
      name: (
        <FormattedMessage
          id="contentManagement.recentlyAccessedItems.table.nameHeader"
          defaultMessage="Name"
        />
      ),
      render: (itemTitle: string, item: any) => (
        <EuiLink
          onClick={() => handleItemClick(item.id, item.link)}
          color="text"
          data-test-subj={`recentlyAccessed-link-${item.id}`}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={getIconType(item)} size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>{itemTitle}</EuiFlexItem>
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
    'data-test-subj': 'recentlyAccessedTable',
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
            id="contentManagement.recentlyAccessedItems.error"
            defaultMessage="Error loading recently viewed items: {errorMessage}"
            values={{ errorMessage: error.message }}
          />
        </EuiText>
      );
    }

    if (items.length === 0) {
      return (
        <EuiText color="subdued" size="s">
          <FormattedMessage
            id="contentManagement.recentlyAccessedItems.empty"
            defaultMessage="Your recently viewed items will appear here"
          />
        </EuiText>
      );
    }

    return <EuiBasicTable {...tableProps} />;
  };

  const content = (
    <>
      {!hideTitle && (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="clock" size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>
                {title || (
                  <FormattedMessage
                    id="contentManagement.recentlyAccessedItems.title"
                    defaultMessage="Recently viewed items"
                  />
                )}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {!hideTitle && <EuiSpacer size="m" />}
      <EuiPanel hasBorder paddingSize="m">
        {renderPanelContent()}
      </EuiPanel>
    </>
  );

  if (!showPanelWrapper) {
    return (
      <div
        className={className}
        style={
          maxWidth || width
            ? {
                ...(maxWidth && { maxWidth: `${maxWidth}px` }),
                ...(width && { width: `${width}px` }),
              }
            : undefined
        }
        data-test-subj={dataTestSubj}
      >
        {content}
      </div>
    );
  }

  return (
    <EuiPanel
      className={className}
      color={color}
      hasBorder={hasBorder}
      hasShadow={hasShadow}
      paddingSize={paddingSize}
      borderRadius={borderRadius}
      css={css}
      style={
        maxWidth || width
          ? {
              ...(maxWidth && { maxWidth: `${maxWidth}px` }),
              ...(width && { width: `${width}px` }),
            }
          : undefined
      }
      data-test-subj={dataTestSubj}
    >
      {content}
    </EuiPanel>
  );
};
