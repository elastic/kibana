/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { createSpecsClient } from './specs_client';
import type { ConnectorSpecWireResponse } from '../fetch_connector_spec';

const wire: ConnectorSpecWireResponse = {
  metadata: {
    id: 'test.connector',
    display_name: 'Test Connector',
    description: 'A test connector',
    minimum_license: 'gold',
    supported_feature_ids: ['alerting'],
    icon: 'testIcon',
    docs_url: 'https://example.com/docs',
    is_technical_preview: true,
  },
  schema: { type: 'object', properties: {} },
  is_testable: true,
  actions: [{ name: 'search', description: 'Search', is_tool: true, scope: 'read' }],
};

describe('createSpecsClient', () => {
  describe('get', () => {
    it('calls the encoded spec path with signal and returns the connector spec response', async () => {
      const http = httpServiceMock.createStartContract();
      http.get.mockResolvedValueOnce(wire);
      const signal = new AbortController().signal;

      const result = await createSpecsClient({ http }).get({ id: 'test.connector', signal });

      expect(http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/test.connector/spec',
        {
          signal,
        }
      );
      expect(result).toEqual({
        metadata: {
          id: 'test.connector',
          displayName: 'Test Connector',
          description: 'A test connector',
          minimumLicense: 'gold',
          supportedFeatureIds: ['alerting'],
          icon: 'testIcon',
          docsUrl: 'https://example.com/docs',
          isTechnicalPreview: true,
        },
        schema: { type: 'object', properties: {} },
        isTestable: true,
        actions: [{ name: 'search', description: 'Search', isTool: true, scope: 'read' }],
      });
    });

    it('encodes the connector type id in the path', async () => {
      const http = httpServiceMock.createStartContract();
      http.get.mockResolvedValueOnce({ ...wire, metadata: { ...wire.metadata, id: '.a/b' } });

      await createSpecsClient({ http }).get({ id: '.a/b' });

      expect(http.get).toHaveBeenCalledWith('/internal/actions/connector_types/.a%2Fb/spec', {
        signal: undefined,
      });
    });
  });
});
