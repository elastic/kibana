/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Welcome } from './welcome';

test('should render a Welcome screen', () => {
  const { getByText } = render(
    <IntlProvider locale="en">
      <Welcome urlBasePath="/" onSkip={() => {}} />
    </IntlProvider>
  );
  expect(getByText('Welcome to Elastic')).toBeInTheDocument();
});
