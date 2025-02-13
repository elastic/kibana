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
import { Footer } from './footer';

test('render Footer component', () => {
  render(
    <IntlProvider locale="en">
      <Footer url={'/app/myapp'} label={'launch myapp'} />
    </IntlProvider>
  );

  // Check if the label is rendered
  expect(screen.getByText('launch myapp')).toBeInTheDocument();

  // Check if the link is rendered with the correct URL
  expect(screen.getByText('launch myapp').closest('a')).toHaveAttribute('href', '/app/myapp');
});
