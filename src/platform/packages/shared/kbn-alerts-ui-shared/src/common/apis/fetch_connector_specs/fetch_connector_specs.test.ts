/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { fetchConnectorSpecs } from './fetch_connector_specs';

const http = httpServiceMock.createStartContract();

describe('fetchConnectorSpecs', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls the bulk specs catalog API and reuses transformConnectorSpecResponse', async () => {
    http.get.mockResolvedValueOnce([
      {
        metadata: {
          id: '.alienvault-otx',
          display_name: 'AlienVault OTX',
          description: 'Threat intel',
          minimum_license: 'gold',
          supported_feature_ids: ['workflows'],
        },
        schema: { type: 'object' },
        is_testable: true,
        is_inbound_only: false,
        actions: {
          getIndicator: {
            input: { type: 'object' },
          },
        },
      },
    ]);

    const result = await fetchConnectorSpecs({ http });

    expect(http.get).toHaveBeenCalledWith('/internal/actions/connector_types/specs');
    expect(result[0].metadata.id).toBe('.alienvault-otx');
    expect(result[0].actions.getIndicator.input).toEqual({ type: 'object' });
    expect(result[0].isInboundOnly).toBe(false);
  });
});
