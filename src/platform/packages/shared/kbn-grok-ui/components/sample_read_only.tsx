/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, EuiToolTip } from '@elastic/eui';
import { combineLatest, debounceTime } from 'rxjs';
import { DraftGrokExpression, FieldDefinition, GrokCollection } from '../models';
import { colourToClassName } from './utils';
import { semanticNameLabel, patternNameLabel, typeNameLabel } from './constants';

// For singular read only sample highlighting, e.g. a column in a data grid
export const Sample = ({
  grokCollection,
  draftGrokExpressions,
  sample = '',
}: {
  grokCollection: GrokCollection;
  draftGrokExpressions: DraftGrokExpression[];
  sample: string;
  onChangeSample?: (sample: string) => void;
  height?: string;
}) => {
  const eui = useEuiTheme();

  const [processedSample, setProcessedSample] = useState<ReactNode>(() =>
    renderProcessedSample(draftGrokExpressions, sample)
  );

  const colourPaletteStyles = useMemo(() => {
    return grokCollection.getColourPaletteStyles();
  }, [grokCollection]);

  useEffect(() => {
    const subscription = combineLatest(draftGrokExpressions.map((draft) => draft.getExpression$()))
      .pipe(debounceTime(300))
      .subscribe(() => {
        setProcessedSample(renderProcessedSample(draftGrokExpressions, sample));
      });
    return () => subscription.unsubscribe();
  }, [draftGrokExpressions, sample]);

  return (
    <>
      <div
        css={css`
          .grok-pattern-match {
            background-color: ${eui.euiTheme.colors.highlight};
          }
          ${colourPaletteStyles}
          white-space: pre-wrap;
        `}
      >
        {processedSample}
      </div>
    </>
  );
};

const renderProcessedSample = (draftGrokExpressions: DraftGrokExpression[], sample: string) => {
  for (const expression of draftGrokExpressions) {
    const regexp = expression.getRegex();
    if (regexp) {
      const result = sample?.match(regexp);
      if (result !== null) {
        const regexpPatternSource = expression.getRegex();
        const fields = expression.getFields();

        if (regexpPatternSource) {
          const regexpPattern = new RegExp(
            regexpPatternSource.source,
            // d flag is added to allow for indices tracking
            regexpPatternSource.flags + 'd'
          );

          // We expect one match per sample (we are not using global matches / flags) or none
          const match = sample.match(regexpPattern);

          const highlightSpans = [];

          // Overall continuous match highlight (highlights the whole Grok pattern match)
          if (match && match.length > 0) {
            const matchingText = match[0];
            const startIndex = match.index;

            if (startIndex !== undefined) {
              const endIndex = startIndex + matchingText.length;
              highlightSpans.push({ startIndex, endIndex, className: 'grok-pattern-match' });
            }
          }

          // Semantic (field name) match highlights
          const matchGroupResults = regexpPattern.exec(sample);
          if (matchGroupResults && matchGroupResults.indices && matchGroupResults.indices.groups) {
            for (const [key, value] of Object.entries(matchGroupResults.indices.groups)) {
              const fieldDefinition = fields.get(key);
              if (value && fieldDefinition) {
                const [startIndex, endIndex] = value;
                highlightSpans.push({
                  startIndex,
                  endIndex,
                  className: colourToClassName(fieldDefinition?.colour),
                  fieldDefinition,
                });
              }
            }
          }

          // Apply highlights to the sample string
          const highlightedSample = applyHighlights(sample, highlightSpans);

          return <div>{highlightedSample}</div>;
        }
      }
    }
  }

  return <>{sample}</>;
};

const applyHighlights = (sample: string, highlights: HighlightConfiguration[]): React.ReactNode => {
  // Sort highlights by startIndex and endIndex to handle nesting
  const sortedHighlights = [...highlights].sort((a, b) => {
    if (a.startIndex === b.startIndex) {
      return b.endIndex - a.endIndex; // Longer spans come first for nesting
    }
    return a.startIndex - b.startIndex;
  });

  const processText = (
    text: string,
    startIndex: number,
    endIndex: number,
    activeHighlights: HighlightConfiguration[]
  ): React.ReactNode => {
    if (activeHighlights.length === 0) {
      // No active highlights, return plain text
      return text.slice(startIndex, endIndex);
    }

    const currentHighlight = activeHighlights[0];
    const remainingHighlights = activeHighlights.slice(1);

    const parts: React.ReactNode[] = [];

    // Add text before the current highlight
    if (startIndex < currentHighlight.startIndex) {
      parts.push(
        <span key={`${startIndex}-${currentHighlight.startIndex}`}>
          {text.slice(startIndex, currentHighlight.startIndex)}
        </span>
      );
    }

    const highlightedTextSpan = (
      <span
        key={`${currentHighlight.startIndex}-${currentHighlight.endIndex}`}
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
    // Add the highlighted text, recursively processing nested highlights
    parts.push(
      currentHighlight.fieldDefinition ? (
        <EuiToolTip
          position="top"
          content={
            <>
              <p>
                {semanticNameLabel} {currentHighlight.fieldDefinition.name}
              </p>{' '}
              <p>
                {' '}
                {patternNameLabel} {currentHighlight.fieldDefinition.pattern}
              </p>{' '}
              {currentHighlight.fieldDefinition.type && (
                <p>
                  {typeNameLabel} {currentHighlight.fieldDefinition.type}
                </p>
              )}
            </>
          }
        >
          {highlightedTextSpan}
        </EuiToolTip>
      ) : (
        highlightedTextSpan
      )
    );

    // Add text after the current highlight
    if (currentHighlight.endIndex < endIndex) {
      parts.push(
        <span key={`${currentHighlight.endIndex}-${endIndex}`}>
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

interface HighlightConfiguration {
  startIndex: number;
  endIndex: number;
  className: string;
  fieldDefinition?: FieldDefinition;
}
