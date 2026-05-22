/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiToolTip } from '@elastic/eui';

export interface HighlightConfiguration {
  startIndex: number;
  endIndex: number;
  className: string;
  tooltipContent?: ReactNode;
}

export const applyHighlights = (
  sample: string,
  highlights: HighlightConfiguration[]
): ReactNode => {
  const sortedHighlights = [...highlights].sort((a, b) => {
    if (a.startIndex === b.startIndex) {
      return b.endIndex - a.endIndex;
    }
    return a.startIndex - b.startIndex;
  });

  const processText = (
    text: string,
    startIndex: number,
    endIndex: number,
    activeHighlights: HighlightConfiguration[]
  ): ReactNode => {
    if (activeHighlights.length === 0) {
      return text.slice(startIndex, endIndex);
    }

    const currentHighlight = activeHighlights[0];
    const remainingHighlights = activeHighlights.slice(1);

    const parts: ReactNode[] = [];

    if (startIndex < currentHighlight.startIndex) {
      parts.push(
        <span key={`pre-${startIndex}-${currentHighlight.startIndex}`}>
          {text.slice(startIndex, currentHighlight.startIndex)}
        </span>
      );
    }

    const highlightedTextSpan = (
      <span
        key={`hl-${currentHighlight.startIndex}-${currentHighlight.endIndex}`}
        className={currentHighlight.className}
      >
        {processText(
          text,
          currentHighlight.startIndex,
          currentHighlight.endIndex,
          remainingHighlights.filter(
            (h) =>
              h.startIndex >= currentHighlight.startIndex && h.endIndex <= currentHighlight.endIndex
          )
        )}
      </span>
    );

    parts.push(
      currentHighlight.tooltipContent ? (
        <EuiToolTip
          key={`tt-${currentHighlight.startIndex}-${currentHighlight.endIndex}`}
          position="top"
          content={currentHighlight.tooltipContent}
        >
          {highlightedTextSpan}
        </EuiToolTip>
      ) : (
        highlightedTextSpan
      )
    );

    if (currentHighlight.endIndex < endIndex) {
      parts.push(
        <span key={`post-${currentHighlight.endIndex}-${endIndex}`}>
          {processText(
            text,
            currentHighlight.endIndex,
            endIndex,
            remainingHighlights.filter((h) => h.startIndex >= currentHighlight.endIndex)
          )}
        </span>
      );
    }

    return parts;
  };

  return processText(sample, 0, sample.length, sortedHighlights);
};
