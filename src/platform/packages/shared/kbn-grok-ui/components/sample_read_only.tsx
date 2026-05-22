/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { combineLatest, debounceTime } from 'rxjs';
import type { DraftGrokExpression, GrokCollection } from '../models';
import { colourToClassName } from './utils';
import { semanticNameLabel, patternNameLabel, typeNameLabel } from './constants';
import { applyHighlights } from './highlight_utils';
import type { HighlightConfiguration } from './highlight_utils';

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
    return grokCollection.getColourPaletteStyles(eui.euiTheme);
  }, [eui.euiTheme, grokCollection]);

  useEffect(() => {
    const subscription = combineLatest(draftGrokExpressions.map((draft) => draft.getExpression$()))
      .pipe(debounceTime(300))
      .subscribe(() => {
        setProcessedSample(renderProcessedSample(draftGrokExpressions, sample));
      });
    return () => subscription.unsubscribe();
  }, [draftGrokExpressions, sample]);

  if (sample === '') {
    return <>&nbsp;</>;
  }

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

const buildFieldTooltip = (fieldDef: {
  name: string;
  pattern: string;
  type: string | null;
}): ReactNode => (
  <>
    <p>
      {semanticNameLabel} {fieldDef.name}
    </p>{' '}
    <p>
      {' '}
      {patternNameLabel} {fieldDef.pattern}
    </p>{' '}
    {fieldDef.type && (
      <p>
        {typeNameLabel} {fieldDef.type}
      </p>
    )}
  </>
);

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
            regexpPatternSource.flags + 'd'
          );

          const match = sample.match(regexpPattern);

          const highlightSpans: HighlightConfiguration[] = [];

          if (match && match.length > 0) {
            const matchingText = match[0];
            const startIndex = match.index;

            if (startIndex !== undefined) {
              const endIndex = startIndex + matchingText.length;
              highlightSpans.push({ startIndex, endIndex, className: 'grok-pattern-match' });
            }
          }

          const matchGroupResults = regexpPattern.exec(sample);
          if (matchGroupResults && matchGroupResults.indices && matchGroupResults.indices.groups) {
            for (const [key, value] of Object.entries(matchGroupResults.indices.groups)) {
              const fieldDefinition = fields.get(key);
              if (value && fieldDefinition) {
                const [startIndex, endIndex] = value;
                highlightSpans.push({
                  startIndex,
                  endIndex,
                  className: colourToClassName(fieldDefinition.colour),
                  tooltipContent: buildFieldTooltip(fieldDefinition),
                });
              }
            }
          }

          const highlightedSample = applyHighlights(sample, highlightSpans);

          return <div>{highlightedSample}</div>;
        }
      }
    }
  }

  return <>{sample}</>;
};
