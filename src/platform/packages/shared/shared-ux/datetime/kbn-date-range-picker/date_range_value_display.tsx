/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, type ReactNode } from 'react';

import type { RangePart } from './parse/parse_range_parts';
import { parseDisplayParts } from './parse/parse_range_parts';
import * as styles from './date_range_value_display.styles';

interface DateRangeValueDisplayProps {
  /** The full display text to render, e.g. "Last 15 minutes". */
  displayText: string;
  /** Invoked when the user clicks a navigable part of the display text. */
  onPartClick: (part: RangePart) => void;
  /** When true, parts are rendered as plain text and click handlers are not attached. */
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
  const parts = parseDisplayParts(displayText);
  const chunks: ReactNode[] = [];
  let cursor = 0;

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
          css={!disabled && styles.part}
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
    <span
      className="eui-textTruncate"
      css={styles.root}
      data-test-subj="dateRangePickerValueDisplay"
    >
      {chunks}
    </span>
  );
}
