/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type CSSProperties, type FunctionComponent } from 'react';
import { css } from '@emotion/react';
import { EuiText, EuiTextTruncate, euiFontSize, useEuiTheme } from '@elastic/eui';
import type { InfoBlockItem } from './types';

export type InfoBlockProps = InfoBlockItem;

const styles = {
  block: css`
    min-width: 0;
  `,
  // Links in custom values track the value's own weight.
  value: css`
    a {
      font-weight: inherit;
    }
  `,
};

/** A single title/value pair; one grid cell of an `InfoBlocks` panel. */
export const InfoBlock: FunctionComponent<InfoBlockProps> = ({
  title,
  value,
  size,
  color,
  ...rest
}) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const valueFontSize = size ? euiFontSize(euiThemeContext, size, { unit: 'px' }) : undefined;
  // Primitive values get built-in single-line truncation.
  const isTextValue = typeof value === 'string' || typeof value === 'number';

  // Inline: the font scale resolves per item, so it never repeats across blocks.
  const valueStyle: CSSProperties = valueFontSize
    ? {
        fontSize: valueFontSize.fontSize,
        lineHeight: valueFontSize.lineHeight,
        fontWeight: euiTheme.font.weight.semiBold,
      }
    : { fontWeight: euiTheme.font.weight.bold };

  return (
    <div data-test-subj={rest['data-test-subj'] ?? 'infoBlock'} css={styles.block}>
      <EuiText size="xs" color="subdued">
        <EuiTextTruncate text={title} />
      </EuiText>
      <EuiText size="s" color={color} css={styles.value} style={valueStyle}>
        {isTextValue ? <EuiTextTruncate text={String(value)} /> : value}
      </EuiText>
    </div>
  );
};
