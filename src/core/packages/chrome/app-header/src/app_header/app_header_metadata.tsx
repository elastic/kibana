/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonEmpty, EuiHealth, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AppHeaderMetadataItem, AppHeaderMetadataItems } from '../types';

const AppHeaderMetadataEntry = ({ item }: { item: AppHeaderMetadataItem }) => {
  const { euiTheme } = useEuiTheme();

  if (item.type === 'button') {
    const buttonInteraction = item.href ? { href: item.href } : { onClick: item.onClick };

    return (
      <EuiButtonEmpty
        color="text"
        data-test-subj={item['data-test-subj']}
        flush="both"
        iconType={item.iconType}
        size="xs"
        {...buttonInteraction}
      >
        {item.label}
      </EuiButtonEmpty>
    );
  }

  if (item.type === 'health') {
    return (
      <EuiHealth color={item.color} data-test-subj={item['data-test-subj']} textSize="xs">
        {item.label}
      </EuiHealth>
    );
  }

  return (
    <EuiText
      css={css`
        color: ${euiTheme.colors.textParagraph};
        font-weight: ${euiTheme.font.weight.medium};
      `}
      data-test-subj={item['data-test-subj']}
      size="xs"
    >
      {item.label}
    </EuiText>
  );
};

export const AppHeaderMetadata = React.memo<{ metadata: AppHeaderMetadataItems }>(
  ({ metadata }) => {
    return (
      <>
        {metadata
          .slice(0, 3)
          .filter((item): item is AppHeaderMetadataItem => item !== undefined)
          .map((item, index) => (
            <AppHeaderMetadataEntry item={item} key={`${item.type}-${item.label}-${index}`} />
          ))}
      </>
    );
  }
);

AppHeaderMetadata.displayName = 'AppHeaderMetadata';
