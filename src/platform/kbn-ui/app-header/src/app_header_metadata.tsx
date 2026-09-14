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
import { asOptionalPlainText, asPlainText } from './as_plain_text';
import type { AppHeaderMetadataItem, AppHeaderMetadataItems } from './types';

const AppHeaderMetadataEntry = ({
  item,
  isFirst,
}: {
  item: AppHeaderMetadataItem;
  isFirst: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const label = asPlainText(item.label);
  const value = item.type === 'text' ? asOptionalPlainText(item.value) : undefined;

  // Shared resting style for every metadata entry: subdued color, bold label.
  const labelStyles = css`
    color: ${euiTheme.colors.textSubdued};
    font-weight: ${euiTheme.font.weight.bold};
  `;
  const firstItemOffset =
    isFirst && item.type !== 'health'
      ? css`
          padding-inline-start: ${euiTheme.size.xs};
        `
      : undefined;

  if (item.type === 'button') {
    const buttonInteraction = item.href ? { href: item.href } : { onClick: item.onClick };

    return (
      <EuiButtonEmpty
        color="text"
        css={[
          labelStyles,
          firstItemOffset,
          // Collapse the button to its content height so it doesn't add vertical
          // space and inflate the centered metadata row.
          css`
            block-size: auto;
            min-block-size: 0;
            line-height: inherit;
          `,
        ]}
        data-test-subj={item['data-test-subj']}
        flush="both"
        size="xs"
        {...buttonInteraction}
      >
        {label}
      </EuiButtonEmpty>
    );
  }

  if (item.type === 'health') {
    return (
      <EuiHealth
        color={item.color}
        css={labelStyles}
        data-test-subj={item['data-test-subj']}
        textSize="xs"
      >
        {label}
      </EuiHealth>
    );
  }

  return (
    <EuiText css={[labelStyles, firstItemOffset]} data-test-subj={item['data-test-subj']} size="xs">
      {label}
      {value !== undefined && (
        <span
          css={css`
            font-weight: ${euiTheme.font.weight.medium};
          `}
        >
          {' '}
          {value}
        </span>
      )}
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
            <AppHeaderMetadataEntry
              item={item}
              isFirst={index === 0}
              key={`${item.type}-${asPlainText(item.label)}-${index}`}
            />
          ))}
      </>
    );
  }
);

AppHeaderMetadata.displayName = 'AppHeaderMetadata';
