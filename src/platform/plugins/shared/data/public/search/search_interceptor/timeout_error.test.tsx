/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AbortError } from '@kbn/kibana-utils-plugin/public';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { render, screen } from '@testing-library/react';
import { SearchTimeoutError, TimeoutErrorMode } from './timeout_error';
import userEvent from '@testing-library/user-event';

const applicationMock = applicationServiceMock.createStartContract();

describe('SearchTimeoutError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should create contact admin message', () => {
    const error = new SearchTimeoutError(new AbortError(), TimeoutErrorMode.CONTACT);

    render(error.getErrorMessage(applicationMock));

    expect(
      screen.getByText(
        /Your query has timed out\. Contact your system administrator to increase the run time\./
      )
    ).toBeVisible();
  });

  it('Should navigate to settings', async () => {
    const user = userEvent.setup();
    const error = new SearchTimeoutError(new AbortError(), TimeoutErrorMode.CHANGE);

    render(error.getErrorMessage(applicationMock));

    expect(
      screen.getByText(
        /Your query has timed out. Increase run time with the search timeout advanced setting./
      )
    ).toBeVisible();

    const editButton = screen.getByText('Edit setting');
    await user.click(editButton);
    expect(applicationMock.navigateToApp).toHaveBeenCalledWith('management', {
      path: '/kibana/settings',
    });
  });
});
