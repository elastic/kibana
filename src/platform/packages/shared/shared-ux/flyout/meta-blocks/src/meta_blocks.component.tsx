/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FunctionComponent } from 'react';
import { css } from '@emotion/react';
import { EuiText, EuiTextTruncate, useEuiMemoizedStyles } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import type { MetaBlocksProps } from './types';

const styles = ({ euiTheme }: UseEuiTheme) => {
  return {
    list: css`
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: ${euiTheme.size.xs} ${euiTheme.size.m};
    `,
    item: css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      flex: 0 1 auto;
      min-width: 0;
    `,
    key: css`
      flex: 0 0 auto;
      white-space: nowrap;
      font-weight: ${euiTheme.font.weight.bold};
    `,
    value: css`
      flex: 0 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      a {
        font-weight: ${euiTheme.font.weight.regular};
      }
    `,
    truncatedValue: css`
      position: relative;
      flex: 0 1 auto;
      min-width: 0;
      overflow: hidden;
    `,
    fullTextSizer: css`
      visibility: hidden;
      white-space: nowrap;
      /* EuiTextTruncate measures an integer-rounded width; without this cushion a sub-pixel
         deficit makes it truncate text that already fits. */
      padding-inline-end: 1px;
    `,
    truncationOverlay: css`
      position: absolute;
      inset: 0;
    `,
  };
};

/** A compact, responsive row of key-value pairs. */
export const MetaBlocks: FunctionComponent<MetaBlocksProps> = ({ items, ...rest }) => {
  const memoized = useEuiMemoizedStyles(styles);

  if (items.length === 0) {
    return null;
  }

  return (
    <div css={memoized.list} data-test-subj={rest['data-test-subj'] ?? 'metablocks-container'}>
      {items.map((item, index) => {
        const isStringValue = typeof item.value === 'string';

        return (
          <EuiText
            key={item.id ?? index}
            size="s"
            css={memoized.item}
            data-test-subj={item['data-test-subj']}
          >
            <span css={memoized.key}>{item.title}</span>
            {isStringValue ? (
              <span css={memoized.truncatedValue}>
                <span css={memoized.fullTextSizer} aria-hidden>
                  {item.value}
                </span>
                <span css={memoized.truncationOverlay}>
                  <EuiTextTruncate text={item.value as string} truncation="middle" />
                </span>
              </span>
            ) : (
              <span css={memoized.value}>{item.value}</span>
            )}
          </EuiText>
        );
      })}
    </div>
  );
};
