/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformConnectorSpecsResponse } from './transform_connector_specs_response';

describe('transformConnectorSpecsResponse', () => {
  it('maps snake_case catalog entries to camelCase', () => {
    const result = transformConnectorSpecsResponse({
      specs: [
        {
          id: '.alienvault-otx',
          metadata: {
            id: '.alienvault-otx',
            display_name: 'AlienVault OTX',
            description: 'Threat intel',
            minimum_license: 'gold',
            supported_feature_ids: ['workflows'],
          },
          is_inbound_only: false,
          actions: {
            getIndicator: {
              is_tool: true,
              description: 'Look up an indicator',
              input_json_schema: { type: 'object', properties: { indicator: { type: 'string' } } },
            },
          },
        },
      ],
    });

    expect(result).toEqual([
      {
        id: '.alienvault-otx',
        metadata: {
          id: '.alienvault-otx',
          displayName: 'AlienVault OTX',
          description: 'Threat intel',
          minimumLicense: 'gold',
          supportedFeatureIds: ['workflows'],
        },
        isInboundOnly: false,
        actions: {
          getIndicator: {
            isTool: true,
            description: 'Look up an indicator',
            inputJsonSchema: { type: 'object', properties: { indicator: { type: 'string' } } },
          },
        },
      },
    ]);
  });
});
