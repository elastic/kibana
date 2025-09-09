/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { EuiTextTruncate, type EuiTextTruncationTypes, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getHighlightColors } from '@kbn/data-grid-in-table-search/src/get_highlight_colors';
import React, { useMemo } from 'react';

export const MetricTermWithHighlight = ({
  searchTerm,
  text,
  truncation,
}: {
  searchTerm: string;
  text: string;
  truncation: EuiTextTruncationTypes;
}): React.ReactNode => {
  const { euiTheme } = useEuiTheme();
  const colors = useMemo(() => getHighlightColors(euiTheme), [euiTheme]);

  if (!searchTerm) {
    return <EuiTextTruncate truncation={truncation} text={text} />;
  }
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            css={css`
              color: ${colors.highlightColor} !important;
              background-color: ${colors.highlightBackgroundColor} !important;
            `}
          >
            {part}
          </mark>
        ) : (
          <span data-test-subj={`${part}${index}`} key={`${part}${index}`}>
            {part}
          </span>
        )
      )}
    </>
  );
};
