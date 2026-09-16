/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformConnectorSpecResponse } from './transform_connector_spec_response';

describe('transformConnectorSpecResponse', () => {
  it('maps snake_case metadata to ConnectorMetadata', () => {
    const result = transformConnectorSpecResponse({
      metadata: {
        id: '.my-connector',
        display_name: 'My connector',
        description: 'Does things',
        minimum_license: 'basic',
        supported_feature_ids: ['alerting'],
        icon: 'logoElastic',
        docs_url: 'https://example.com/docs',
        is_technical_preview: true,
      },
      schema: { type: 'object', properties: {} },
      is_testable: true,
    });

    expect(result.metadata).toEqual({
      id: '.my-connector',
      displayName: 'My connector',
      description: 'Does things',
      minimumLicense: 'basic',
      supportedFeatureIds: ['alerting'],
      icon: 'logoElastic',
      docsUrl: 'https://example.com/docs',
      isTechnicalPreview: true,
    });
    expect(result.schema).toEqual({ type: 'object', properties: {} });
    expect(result.isTestable).toBe(true);
  });

  it('omits optional metadata fields when absent on the wire', () => {
    const result = transformConnectorSpecResponse({
      metadata: {
        id: 'c',
        display_name: 'C',
        description: 'D',
        minimum_license: 'gold',
        supported_feature_ids: ['cases'],
      },
      schema: {},
      is_testable: false,
    });

    expect(result.metadata).toEqual({
      id: 'c',
      displayName: 'C',
      description: 'D',
      minimumLicense: 'gold',
      supportedFeatureIds: ['cases'],
    });
    expect(result.isTestable).toBe(false);
  });
});
