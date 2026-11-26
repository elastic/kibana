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
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { ResultsVerdict } from './compare_results';
import { ResultsCheck } from './suggestion_comparison';

describe('ResultsCheck', () => {
  const colorOf = (verdict: ResultsVerdict, isSorted: boolean): string => {
    const { unmount } = render(
      <EuiProvider>
        <I18nProvider>
          <ResultsCheck verdict={verdict} isSorted={isSorted} />
        </I18nProvider>
      </EuiProvider>
    );
    const { color } = window.getComputedStyle(screen.getByTestId('esqlQueryProfileResultsCheck'));
    unmount();
    return color;
  };
  const sameOrder: ResultsVerdict = { kind: 'same', rowCount: 2, sameOrder: true };
  const otherOrder: ResultsVerdict = { kind: 'same', rowCount: 2, sameOrder: false };

  it('warns about rows in another order only when the original query sorts its output', () => {
    const success = colorOf(sameOrder, true);

    expect(colorOf(otherOrder, false)).toBe(success);
    expect(colorOf(otherOrder, true)).not.toBe(success);
  });
});
