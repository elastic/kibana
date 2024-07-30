/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { FlyoutError } from './flyout_error';
import { FLYOUT_ERROR_TEST_ID } from '../test_ids';

describe('<FlyoutError />', () => {
  it('should render error title and body', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <FlyoutError />
      </IntlProvider>
    );
    expect(getByTestId(FLYOUT_ERROR_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(FLYOUT_ERROR_TEST_ID)).toHaveTextContent('Unable to display data');
    expect(getByTestId(FLYOUT_ERROR_TEST_ID)).toHaveTextContent(
      'There was an error displaying data.'
    );
  });
});
