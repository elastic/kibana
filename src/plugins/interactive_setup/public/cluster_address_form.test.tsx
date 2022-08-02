/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { coreMock, themeServiceMock } from '@kbn/core/public/mocks';

import { ClusterAddressForm } from './cluster_address_form';
import { Providers } from './plugin';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('ClusterAddressForm', () => {
  jest.setTimeout(20_000);

  const theme$ = themeServiceMock.createTheme$();

  it('calls enrollment API when submitting form', async () => {
    const coreStart = coreMock.createStart();
    coreStart.http.post.mockResolvedValue({});

    const onSuccess = jest.fn();

    const { findByRole, findByLabelText } = render(
      <Providers services={coreStart} theme$={theme$}>
        <ClusterAddressForm onSuccess={onSuccess} />
      </Providers>
    );
    fireEvent.change(await findByLabelText('Address'), {
      target: { value: 'https://localhost' },
    });
    fireEvent.click(await findByRole('button', { name: 'Check address', hidden: true }));

    await waitFor(() => {
      expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/interactive_setup/ping', {
        body: JSON.stringify({
          host: 'https://localhost:9200',
        }),
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('validates form', async () => {
    const coreStart = coreMock.createStart();
    const onSuccess = jest.fn();

    const { findAllByText, findByRole, findByLabelText } = render(
      <Providers services={coreStart} theme$={theme$}>
        <ClusterAddressForm onSuccess={onSuccess} />
      </Providers>
    );

    fireEvent.change(await findByLabelText('Address'), {
      target: { value: 'localhost' },
    });

    fireEvent.click(await findByRole('button', { name: 'Check address', hidden: true }));

    await findAllByText(/Enter a valid address/i);

    expect(coreStart.http.post).not.toHaveBeenCalled();
  });
});
