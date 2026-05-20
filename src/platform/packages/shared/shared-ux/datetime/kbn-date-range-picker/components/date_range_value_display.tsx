/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, type ReactNode } from 'react';

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import type { RangePart } from '../parse/parse_range_parts';
import { parseDisplayParts } from '../parse/parse_range_parts';

interface DateRangeValueDisplayProps {
  displayText: string;
  onPartClick: (part: RangePart) => void;
  disabled?: boolean;
}

/**
 * Renders display text with individually hoverable, clickable date range parts.
 */
export function DateRangeValueDisplay({
  displayText,
  onPartClick,
  disabled = false,
}: DateRangeValueDisplayProps) {
  const { euiTheme } = useEuiTheme();
  const parts = parseDisplayParts(displayText);
  const chunks: ReactNode[] = [];
  let cursor = 0;

  const containerStyles = css`
    white-space: nowrap;
  `;
  const hoverablePartStyles = css`
    border-radius: 2px;
    /*cursor: ${disabled ? 'default' : 'text'};*/
    padding: 0.125ch 0;

    ${!disabled &&
    `
      &:hover {
        color: ${euiTheme.colors.textPrimary};
        background-color: ${euiTheme.colors.backgroundLightPrimary};
      }
    `}
  `;

  parts.forEach((part, index) => {
    if (part.start > cursor) {
      chunks.push(
        <Fragment key={`text-${index}`}>{displayText.slice(cursor, part.start)}</Fragment>
      );
    }

    if (part.navigable) {
      chunks.push(
        <span
          key={`part-${index}`}
          css={hoverablePartStyles}
          data-test-subj="dateRangePickerDisplayPart"
          onMouseDown={disabled ? undefined : () => onPartClick(part)}
        >
          {part.text}
        </span>
      );
    } else {
      chunks.push(<span key={`part-${index}`}>{part.text}</span>);
    }

    cursor = part.end;
  });

  if (cursor < displayText.length) {
    chunks.push(<Fragment key="text-rest">{displayText.slice(cursor)}</Fragment>);
  }

  return (
    <span css={containerStyles} data-test-subj="dateRangePickerValueDisplay">
      {chunks}
    </span>
  );
}
