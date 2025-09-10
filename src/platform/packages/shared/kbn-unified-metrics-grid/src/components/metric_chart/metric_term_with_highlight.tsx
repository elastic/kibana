/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  EuiTextTruncate,
  type EuiTextTruncationTypes,
  useEuiTheme,
  EuiHighlight,
} from '@elastic/eui';
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

  return (
    <EuiHighlight
      css={css`
        & mark {
          color: ${colors.highlightColor};
          background-color: ${colors.highlightBackgroundColor};
        }
        overflow: ellipsis;
        text-overflow: ellipsis;
        white-space: nowrap;
      `}
      strict={false}
      highlightAll
      search={searchTerm}
    >
      {text}
    </EuiHighlight>
  );
};
