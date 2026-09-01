/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { cpsPluginMock } from '@kbn/cps/public/mocks';
import type { ICPSManager } from '@kbn/cps-utils';
import { RequestDetails } from './request_details';
import type { Request } from '../../../../common/adapters/request/types';

const request = {
  response: {
    json: {
      rawResponse: {
        _clusters: {
          total: 2,
          successful: 2,
          skipped: 0,
          details: {
            _origin: {
              status: 'successful',
              indices: 'kibana_sample_data_logs',
              took: 0,
              timed_out: false,
              _shards: {
                total: 2,
                successful: 2,
                skipped: 0,
                failed: 0,
              },
            },
            'my-project-b72b95': {
              status: 'successful',
              indices: 'kibana_sample_data_logs',
              took: 1,
              timed_out: false,
              _shards: {
                total: 2,
                successful: 2,
                skipped: 0,
                failed: 0,
              },
            },
          },
        },
      },
    },
  },
} as unknown as Request;

function renderRequestDetails(cpsManager?: ICPSManager) {
  return render(
    <KibanaContextProvider services={{ cpsManager }}>
      <RequestDetails request={request} />
    </KibanaContextProvider>
  );
}

describe('RequestDetails', () => {
  test('should show the Clusters tab and no Projects tab when there is no CPS manager', async () => {
    renderRequestDetails();

    expect(await screen.findByTestId('inspectorRequestDetailClusters')).toBeInTheDocument();
    expect(screen.queryByTestId('inspectorRequestDetailProjects')).toBeNull();
  });

  test('should show the Clusters tab and no Projects tab when there are no linked projects', async () => {
    const cpsManager = cpsPluginMock.createStartContract().cpsManager as jest.Mocked<ICPSManager>;

    renderRequestDetails(cpsManager);

    expect(await screen.findByTestId('inspectorRequestDetailClusters')).toBeInTheDocument();
    expect(screen.queryByTestId('inspectorRequestDetailProjects')).toBeNull();
  });

  test('should show the Projects tab instead of the Clusters tab when there are linked projects', async () => {
    const cpsManager = cpsPluginMock.createStartContract().cpsManager as jest.Mocked<ICPSManager>;
    cpsManager.hasLinkedProjects.mockReturnValue(true);

    renderRequestDetails(cpsManager);

    expect(await screen.findByTestId('inspectorRequestDetailProjects')).toBeInTheDocument();
    expect(screen.queryByTestId('inspectorRequestDetailClusters')).toBeNull();
  });

  test('should swap the Clusters tab for the Projects tab once CPS reports linked projects', async () => {
    const cpsManager = cpsPluginMock.createStartContract().cpsManager as jest.Mocked<ICPSManager>;
    let resolveReady!: () => void;
    cpsManager.whenReady.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveReady = resolve;
      })
    );
    cpsManager.hasLinkedProjects.mockReturnValue(false);

    renderRequestDetails(cpsManager);

    expect(await screen.findByTestId('inspectorRequestDetailClusters')).toBeInTheDocument();

    cpsManager.hasLinkedProjects.mockReturnValue(true);
    await act(async () => {
      resolveReady();
    });

    await waitFor(() => {
      expect(screen.getByTestId('inspectorRequestDetailProjects')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('inspectorRequestDetailClusters')).toBeNull();
  });
});
