/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiFlexGrid,
  EuiFlexItem,
  EuiHeaderAlert,
  EuiImage,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import type { NewsfeedItem } from '../types';

interface NewsListingProps {
  feedItems: NewsfeedItem[];
  asSingleColumn?: boolean;
}

export const NewsListing: React.FC<NewsListingProps> = ({ feedItems, asSingleColumn }) => {
  const { euiTheme } = useEuiTheme();

  return feedItems.map((item: NewsfeedItem, index: number) => {
    const isLastItem = index === feedItems.length - 1;
    return (
      <EuiFlexGrid
        key={item.hash}
        columns={asSingleColumn ? 1 : 2}
        gutterSize="s"
        style={{
          borderBottom: isLastItem
            ? 'none'
            : `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
          paddingBottom: euiTheme.size.base,
          marginBottom: isLastItem ? 0 : euiTheme.size.base,
        }}
      >
        <EuiFlexItem>
          {item.heroImageUrl && <EuiImage src={item.heroImageUrl} alt={item.title} />}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHeaderAlert
            key={item.hash}
            title={item.title}
            text={item.description}
            data-test-subj="newsHeadAlert"
            action={
              <EuiLink target="_blank" href={item.linkUrl} external>
                {item.linkText}
              </EuiLink>
            }
            date={item.publishOn.format('DD MMMM YYYY')}
            badge={item.badge ? <EuiBadge color="hollow">{item.badge}</EuiBadge> : undefined}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    );
  });
};
