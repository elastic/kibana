/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { GetConnectorSpecResponse } from '@kbn/actions-plugin/common';
import { createSpecsClient } from './specs_client';

const formSchema = { type: 'object', properties: {} };
const inputSchema = { type: 'object', properties: { q: { type: 'string' } } };

const fullWire: GetConnectorSpecResponse = {
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
  schema: formSchema,
  is_testable: true,
  auth_type_ids: ['basic', 'api_key_header'],
  has_inbound_events: true,
  is_inbound_only: false,
  is_ears_experimental: false,
  actions: [
    {
      name: 'search',
      description: 'Search',
      is_tool: true,
      scope: 'read',
      input_schema: inputSchema,
    },
  ],
};

describe('createSpecsClient', () => {
  describe('get', () => {
    it('calls the encoded spec path with signal and returns camelCase detail', async () => {
      const http = httpServiceMock.createStartContract();
      http.get.mockResolvedValueOnce(fullWire);
      const signal = new AbortController().signal;

      const result = await createSpecsClient({ http }).get({ id: 'test.connector', signal });

      expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "/internal/actions/connector_types/test.connector/spec",
          Object {
            "signal": AbortSignal {},
          },
        ]
      `);
      expect(result.formSchema).toBe(formSchema);
      expect(result.authTypeIds).toEqual(['basic', 'api_key_header']);
      expect(result).not.toHaveProperty('availability');
      expect(result).not.toHaveProperty('skill');
      expect(result.actions[0].inputSchema).toBe(inputSchema);
      expect(result.icon).toBe('testIcon');
      expect(result.docsUrl).toBe('https://example.com/docs');
    });

    it('encodes connector type ids in the path', async () => {
      const http = httpServiceMock.createStartContract();
      http.get.mockResolvedValueOnce(fullWire);

      await createSpecsClient({ http }).get({ id: '.alienvault-otx' });

      expect(http.get.mock.calls[0][0]).toBe(
        '/internal/actions/connector_types/.alienvault-otx/spec'
      );
    });

    it('omits optional icon and docsUrl when absent on the wire', async () => {
      const http = httpServiceMock.createStartContract();
      http.get.mockResolvedValueOnce({
        ...fullWire,
        metadata: {
          id: fullWire.metadata.id,
          display_name: fullWire.metadata.display_name,
          description: fullWire.metadata.description,
          minimum_license: fullWire.metadata.minimum_license,
          supported_feature_ids: fullWire.metadata.supported_feature_ids,
        },
      });

      const result = await createSpecsClient({ http }).get({ id: 'test.connector' });

      expect(result).not.toHaveProperty('skill');
      expect(result).not.toHaveProperty('icon');
      expect(result).not.toHaveProperty('docsUrl');
    });
  });
});
