/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, type ReactNode } from 'react';
import { useEuiMemoizedStyles } from '@elastic/eui';

import type { RangePart } from './parse/parse_range_parts';
import { parseDisplayParts } from './parse/parse_range_parts';
import { dateRangeValueDisplayStyles } from './date_range_value_display.styles';

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
  const styles = useEuiMemoizedStyles(dateRangeValueDisplayStyles);
  const parts = parseDisplayParts(displayText);

  const chunks = parts.flatMap((part, index) => {
    const gapStart = index === 0 ? 0 : parts[index - 1].end;
    const nodes: ReactNode[] = [];

    if (part.start > gapStart) {
      nodes.push(
        <Fragment key={`text-${index}`}>{displayText.slice(gapStart, part.start)}</Fragment>
      );
    }

    nodes.push(
      part.navigable ? (
        <span
          key={`part-${index}`}
          css={!disabled && styles.part}
          data-test-subj="dateRangePickerDisplayPart"
          onMouseDown={disabled ? undefined : () => onPartClick(part)}
        >
          {part.text}
        </span>
      ) : (
        <span key={`part-${index}`}>{part.text}</span>
      )
    );

    return nodes;
  });

  return (
    <span
      className="eui-textTruncate"
      css={styles.root}
      data-test-subj="dateRangePickerValueDisplay"
    >
      {chunks}
      {displayText.slice(parts.at(-1)?.end ?? 0)}
    </span>
  );
}
