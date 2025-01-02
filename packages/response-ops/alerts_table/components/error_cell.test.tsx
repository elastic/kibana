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
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ErrorCell } from './error_cell';

describe('ErrorCell', () => {
  it('should render the error stack in a code block', () => {
    const error = new Error('An error occurred');
    error.stack = 'Error: An error occurred\n    at <anonymous>:1:1';
    render(
      <IntlProvider locale="en">
        <ErrorCell error={error} />
      </IntlProvider>
    );
    expect(screen.getByRole('code')).toHaveTextContent(
      'Error: An error occurred at <anonymous>:1:1'
    );
  });
});
