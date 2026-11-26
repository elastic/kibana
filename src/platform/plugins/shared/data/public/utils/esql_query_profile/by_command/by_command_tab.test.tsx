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
import { ByCommandTab } from './by_command_tab';

describe('ByCommandTab', () => {
  it('shows a command exactly as it was written, including repeated spaces inside a string', () => {
    const text = 'WHERE name == "a  b"';
    render(
      <EuiProvider>
        <I18nProvider>
          <ByCommandTab
            heat={{
              commands: [
                {
                  command: { name: 'WHERE', text, start: 0, end: text.length },
                  share: 0.5,
                  operators: [],
                },
              ],
              unattributedShare: 0,
              unattributedOperators: [],
              hasSubqueries: false,
            }}
          />
        </I18nProvider>
      </EuiProvider>
    );

    // The text matchers of the testing library collapse whitespace, so the raw text is compared.
    expect(screen.getByTestId('esqlQueryProfileCommand').textContent).toContain(text);
    // And the browser has to keep those spaces when it draws the text.
    expect(window.getComputedStyle(screen.getByText(/WHERE name ==/)).whiteSpace).toBe('pre-wrap');
  });

  describe('the steps that belong to no command', () => {
    const renderWith = (unattributedOperators: string[]) =>
      render(
        <EuiProvider>
          <I18nProvider>
            <ByCommandTab
              heat={{
                commands: [],
                unattributedShare: 0.71,
                unattributedOperators,
                hasSubqueries: false,
              }}
            />
          </I18nProvider>
        </EuiProvider>
      );

    it('names the operators that took the time', () => {
      renderWith(['LuceneSource', 'Project']);

      expect(screen.getByTestId('esqlQueryProfileUnattributed')).toHaveTextContent(
        '71% of the operator time is in steps that belong to no command: LuceneSource, Project.'
      );
    });

    it('names the three slowest and counts the others', () => {
      renderWith(['A', 'B', 'C', 'D', 'E']);

      expect(screen.getByTestId('esqlQueryProfileUnattributed')).toHaveTextContent(
        '71% of the operator time is in steps that belong to no command: A, B, C, and 2 more.'
      );
    });

    it('still says it when no operator can be named', () => {
      renderWith([]);

      expect(screen.getByTestId('esqlQueryProfileUnattributed')).toHaveTextContent(
        '71% of the operator time is in steps that belong to no command.'
      );
    });
  });
});
