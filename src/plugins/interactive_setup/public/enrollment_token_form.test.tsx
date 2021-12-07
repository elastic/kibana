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

import type { EnrollmentToken } from '../common';
import { decodeEnrollmentToken, EnrollmentTokenForm } from './enrollment_token_form';
import { Providers } from './plugin';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

const token: EnrollmentToken = {
  ver: '8.0.0',
  adr: ['localhost:9200'],
  fgr: 'AA:C8:2C:2E:09:58:F4:FE:A1:D2:AB:7F:13:70:C2:7D:EB:FD:A2:23:88:13:E4:DA:3A:D0:59:D0:09:00:07:36',
  key: 'JH-36HoBo4EYIoVhHh2F:uEo4dksARMq_BSHaAHUr8Q',
};

describe('EnrollmentTokenForm', () => {
  jest.setTimeout(20_000);

  const theme$ = themeServiceMock.createTheme$();

  it('calls enrollment API when submitting form', async () => {
    const coreStart = coreMock.createStart();
    coreStart.http.post.mockResolvedValue({});

    const onSuccess = jest.fn();

    const { findByRole, findByLabelText } = render(
      <Providers services={coreStart} theme$={theme$}>
        <EnrollmentTokenForm onSuccess={onSuccess} />
      </Providers>
    );
    fireEvent.change(await findByLabelText('Enrollment token'), {
      target: { value: btoa(JSON.stringify(token)) },
    });
    fireEvent.click(await findByRole('button', { name: 'Configure Elastic', hidden: true }));

    await waitFor(() => {
      expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/interactive_setup/enroll', {
        body: JSON.stringify({
          hosts: [`https://${token.adr[0]}`],
          apiKey: btoa(token.key),
          caFingerprint: token.fgr,
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
        <EnrollmentTokenForm onSuccess={onSuccess} />
      </Providers>
    );

    fireEvent.click(await findByRole('button', { name: 'Configure Elastic', hidden: true }));

    await findAllByText(/Enter an enrollment token/i);

    fireEvent.change(await findByLabelText('Enrollment token'), {
      target: { value: 'invalid' },
    });

    await findAllByText(/Enter a valid enrollment token/i);
  });
});

describe('decodeEnrollmentToken', () => {
  it('should decode a valid token', () => {
    expect(decodeEnrollmentToken(btoa(JSON.stringify(token)))).toEqual({
      adr: ['https://localhost:9200'],
      fgr: 'AA:C8:2C:2E:09:58:F4:FE:A1:D2:AB:7F:13:70:C2:7D:EB:FD:A2:23:88:13:E4:DA:3A:D0:59:D0:09:00:07:36',
      key: 'SkgtMzZIb0JvNEVZSW9WaEhoMkY6dUVvNGRrc0FSTXFfQlNIYUFIVXI4UQ==',
      ver: '8.0.0',
    });
  });

  it('should sort IPv4 before IPv6 addresses', () => {
    expect(
      decodeEnrollmentToken(
        btoa(
          JSON.stringify({ ...token, adr: ['[::1]:9200', '127.0.0.1:9200', '10.17.1.163:9200'] })
        )
      )
    ).toEqual(
      expect.objectContaining({
        adr: ['https://127.0.0.1:9200', 'https://10.17.1.163:9200', 'https://[::1]:9200'],
      })
    );
  });

  it('should not decode an invalid token', () => {
    expect(decodeEnrollmentToken(JSON.stringify(token))).toBeUndefined();
    expect(
      decodeEnrollmentToken(
        btoa(
          JSON.stringify({
            ver: [''],
            adr: null,
            fgr: false,
            key: undefined,
          })
        )
      )
    ).toBeUndefined();
    expect(decodeEnrollmentToken(btoa(JSON.stringify({})))).toBeUndefined();
    expect(decodeEnrollmentToken(btoa(JSON.stringify([])))).toBeUndefined();
    expect(decodeEnrollmentToken(btoa(JSON.stringify(null)))).toBeUndefined();
    expect(decodeEnrollmentToken(btoa(JSON.stringify('')))).toBeUndefined();
  });
});
