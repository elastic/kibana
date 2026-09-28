/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { PatternComparisonMessage } from './use_table_header_components';

describe('PatternComparisonMessage', () => {
  const renderMessage = (patternComparison: 'hint' | 'approximate') =>
    render(
      <I18nProvider>
        <PatternComparisonMessage patternComparison={patternComparison} />
      </I18nProvider>
    );

  it('asks to expand a pattern when nothing is expanded', () => {
    renderMessage('hint');

    expect(screen.getByTestId('patternHistogramComparisonHint')).toHaveTextContent(
      'Expand a pattern to compare its volume with total document volume.'
    );
    expect(screen.queryByTestId('patternHistogramApproximate')).not.toBeInTheDocument();
  });

  it('replaces the hint when the comparison is approximate', () => {
    renderMessage('approximate');

    expect(screen.getByTestId('patternHistogramApproximate')).toHaveTextContent(
      'Pattern comparison is approximate.'
    );
    expect(screen.queryByTestId('patternHistogramComparisonHint')).not.toBeInTheDocument();
  });
});
