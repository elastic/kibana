/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiPanel,
  EuiIcon,
  EuiTitle,
  EuiListGroup,
  EuiLoadingSpinner,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { EuiPanelProps } from '@elastic/eui';
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
  color = 'subdued',
  hasBorder,
  hasShadow,
  paddingSize = 'm',
  borderRadius,
  css,
}) => {
  const handleItemClick = (itemId: string, link: string) => {
    if (onItemSelect) {
      onItemSelect(itemId, link);
    }
  };

  const getDisplayName = (item: RecentlyAccessedItem) => {
    return item.title;
  };

  const getIconType = (item: RecentlyAccessedItem) => {
    if (filter === 'discover') {
      return 'discoverApp';
    }
    if (filter === 'dashboard') {
      return 'dashboardApp';
    }
    return undefined;
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
            defaultMessage="No recently viewed items found"
          />
        </EuiText>
      );
    }

    return (
      <EuiListGroup
        size="s"
        gutterSize="none"
        flush
        listItems={items.map((item) => ({
          label: getDisplayName(item),
          onClick: () => handleItemClick(item.id, item.link),
          'data-test-subj': `recentlyAccessed-${item.id}`,
          iconType: getIconType(item),
        }))}
      />
    );
  };

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
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="clock" size="l" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
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

      <EuiSpacer size="m" />
      {renderPanelContent()}
    </EuiPanel>
  );
};
