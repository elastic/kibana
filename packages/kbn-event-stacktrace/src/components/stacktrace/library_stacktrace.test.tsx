/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { renderWithTheme } from '../../utils/test_helpers';
import { LibraryStacktrace } from './library_stacktrace';

describe('LibraryStacktrace', () => {
  describe('render', () => {
    describe('with no stack frames', () => {
      it('renders null', () => {
        const props = { id: 'testId', stackframes: [] };
        const { queryByTestId } = renderWithTheme(<LibraryStacktrace {...props} />);

        expect(queryByTestId('LibraryStacktraceAccordion')).not.toBeInTheDocument();
      });
    });

    describe('with stack frames', () => {
      it('renders an accordion', () => {
        const props = {
          id: 'testId',
          stackframes: [{ filename: 'testFilename', line: { number: 1 } }],
        };
        const { queryByTestId } = renderWithTheme(<LibraryStacktrace {...props} />);

        expect(queryByTestId('LibraryStacktraceAccordion')).toBeInTheDocument();
      });
    });
  });
});
