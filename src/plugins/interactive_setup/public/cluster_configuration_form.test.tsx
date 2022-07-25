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

import { ClusterConfigurationForm } from './cluster_configuration_form';
import { Providers } from './plugin';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('ClusterConfigurationForm', () => {
  jest.setTimeout(20_000);

  const theme$ = themeServiceMock.createTheme$();

  it('calls enrollment API for https addresses when submitting form', async () => {
    const coreStart = coreMock.createStart();
    coreStart.http.post.mockResolvedValue({});

    const onSuccess = jest.fn();

    const { findByRole, findByLabelText } = render(
      <Providers services={coreStart} theme$={theme$}>
        <ClusterConfigurationForm
          host="https://localhost:9200"
          authRequired
          certificateChain={[
            {
              issuer: {},
              valid_from: '',
              valid_to: '',
              subject: {},
              fingerprint256: '',
              raw: 'cert',
            },
          ]}
          onSuccess={onSuccess}
        />
      </Providers>
    );
    fireEvent.change(await findByLabelText('Username'), {
      target: { value: 'kibana_system' },
    });
    fireEvent.change(await findByLabelText('Password'), {
      target: { value: 'changeme' },
    });
    fireEvent.click(await findByLabelText('Certificate authority'));
    fireEvent.click(await findByRole('button', { name: 'Configure Elastic', hidden: true }));

    await waitFor(() => {
      expect(coreStart.http.post).toHaveBeenLastCalledWith(
        '/internal/interactive_setup/configure',
        {
          body: JSON.stringify({
            host: 'https://localhost:9200',
            username: 'kibana_system',
            password: 'changeme',
            caCert: 'cert',
          }),
        }
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('calls enrollment API for http addresses when submitting form', async () => {
    const coreStart = coreMock.createStart();
    coreStart.http.post.mockResolvedValue({});

    const onSuccess = jest.fn();

    const { findByRole } = render(
      <Providers services={coreStart} theme$={theme$}>
        <ClusterConfigurationForm
          host="http://localhost:9200"
          authRequired={false}
          certificateChain={[]}
          onSuccess={onSuccess}
        />
      </Providers>
    );
    fireEvent.click(await findByRole('button', { name: 'Configure Elastic', hidden: true }));

    await waitFor(() => {
      expect(coreStart.http.post).toHaveBeenLastCalledWith(
        '/internal/interactive_setup/configure',
        {
          body: JSON.stringify({
            host: 'http://localhost:9200',
          }),
        }
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('validates form', async () => {
    const coreStart = coreMock.createStart();
    const onSuccess = jest.fn();

    const { findAllByText, findByRole, findByLabelText } = render(
      <Providers services={coreStart} theme$={theme$}>
        <ClusterConfigurationForm
          host="https://localhost:9200"
          authRequired
          certificateChain={[
            {
              issuer: {},
              valid_from: '',
              valid_to: '',
              subject: {},
              fingerprint256: '',
              raw: 'cert',
            },
          ]}
          onSuccess={onSuccess}
        />
      </Providers>
    );

    fireEvent.click(await findByRole('button', { name: 'Configure Elastic', hidden: true }));

    await findAllByText(/Enter a password/i);
    await findAllByText(/Confirm that you recognize and trust this certificate/i);

    fireEvent.change(await findByLabelText('Username'), {
      target: { value: 'elastic' },
    });

    await findAllByText(/User 'elastic' can't be used as the Kibana system user/i);

    expect(coreStart.http.post).not.toHaveBeenCalled();
  });
});
