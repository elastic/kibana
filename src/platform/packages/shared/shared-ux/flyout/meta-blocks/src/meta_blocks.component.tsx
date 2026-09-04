/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  cloneElement,
  isValidElement,
  type FunctionComponent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { css } from '@emotion/react';
import { EuiLink, EuiText, EuiTextTruncate, useEuiMemoizedStyles } from '@elastic/eui';
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

      a {
        font-weight: ${euiTheme.font.weight.regular};
      }
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

/**
 * A link is inline text, so it can host the truncation. Wrappers that size themselves to their
 * content, such as badges, cannot: `EuiTextTruncate` measures a block-level box, which collapses to
 * zero width inside a shrink-to-fit parent.
 */
const isLinkElement = (value: ReactNode): value is ReactElement<{ children?: ReactNode }> =>
  isValidElement(value) && (value.type === EuiLink || value.type === 'a');

/** The text a value reduces to, or `undefined` when the value is richer than a single string. */
const getTruncatableText = (value: ReactNode): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') {
    // Inline layout collapses surrounding whitespace, but the truncation measurement counts it,
    // which reports text that fits as overflowing.
    return String(value).trim();
  }
  if (isLinkElement(value)) {
    return getTruncatableText(value.props.children);
  }
  return undefined;
};

/**
 * Values are often identifiers, where both ends carry meaning. A link stays outside the truncation:
 * `EuiTextTruncate` marks its truncated text `aria-hidden`, so a link nested within would be
 * focusable yet unreachable to a screen reader.
 */
const renderTruncated = (value: ReactNode, text: string) => {
  const truncated = <EuiTextTruncate text={text} truncation="middle" />;
  return isLinkElement(value) ? cloneElement(value, undefined, truncated) : truncated;
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
        const truncatableText = getTruncatableText(item.value);

        return (
          <EuiText
            key={item.id ?? index}
            size="s"
            css={memoized.item}
            data-test-subj={item['data-test-subj']}
          >
            <span css={memoized.key}>{item.title}</span>
            {truncatableText !== undefined ? (
              <span css={memoized.truncatedValue}>
                <span css={memoized.fullTextSizer} aria-hidden>
                  {item.value}
                </span>
                <span css={memoized.truncationOverlay}>
                  {renderTruncated(item.value, truncatableText)}
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
