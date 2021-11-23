/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { coreMock, themeServiceMock } from 'src/core/public/mocks';

import { Providers } from './plugin';
import { VerificationCodeForm } from './verification_code_form';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('VerificationCodeForm', () => {
  jest.setTimeout(20_000);

  const theme$ = themeServiceMock.createTheme$();

  it('calls enrollment API when submitting form', async () => {
    const coreStart = coreMock.createStart();
    coreStart.http.post.mockResolvedValue({});

    const onSuccess = jest.fn();

    const { findByRole, findByLabelText } = render(
      <Providers services={coreStart} theme$={theme$}>
        <VerificationCodeForm onSuccess={onSuccess} />
      </Providers>
    );
    fireEvent.input(await findByLabelText('Digit 1'), {
      target: { value: '1' },
    });
    fireEvent.input(await findByLabelText('Digit 2'), {
      target: { value: '2' },
    });
    fireEvent.input(await findByLabelText('Digit 3'), {
      target: { value: '3' },
    });
    fireEvent.input(await findByLabelText('Digit 4'), {
      target: { value: '4' },
    });
    fireEvent.input(await findByLabelText('Digit 5'), {
      target: { value: '5' },
    });
    fireEvent.input(await findByLabelText('Digit 6'), {
      target: { value: '6' },
    });
    fireEvent.click(await findByRole('button', { name: 'Verify', hidden: true }));

    await waitFor(() => {
      expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/interactive_setup/verify', {
        body: JSON.stringify({ code: '123456' }),
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('validates form', async () => {
    const coreStart = coreMock.createStart();
    const onSuccess = jest.fn();

    const { findAllByText, findByRole, findByLabelText } = render(
      <Providers services={coreStart} theme$={theme$}>
        <VerificationCodeForm onSuccess={onSuccess} />
      </Providers>
    );

    fireEvent.click(await findByRole('button', { name: 'Verify', hidden: true }));

    await findAllByText(/Enter the verification code from the Kibana server/i);

    fireEvent.input(await findByLabelText('Digit 1'), {
      target: { value: '1' },
    });

    await findAllByText(/Enter all six digits/i);
  });
});
