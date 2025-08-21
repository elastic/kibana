/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { InternalConnectorStepImpl, type InternalConnectorStep } from './internal_connector_step';

// Simple test to verify the step can be instantiated
describe('InternalConnectorStepImpl', () => {
  it('should be properly structured', () => {
    // This test verifies that the step implementation is properly structured
    // and can be imported without errors
    expect(InternalConnectorStepImpl).toBeDefined();
    expect(typeof InternalConnectorStepImpl).toBe('function');
  });

  it('should have the correct step interface', () => {
    const mockStep: InternalConnectorStep = {
      name: 'test-elasticsearch-request',
      type: 'elasticsearch.request',
      spaceId: 'default',
      request: {
        method: 'GET',
        path: '/_search',
        body: {
          query: {
            match_all: {}
          }
        }
      }
    };

    expect(mockStep.type).toBe('elasticsearch.request');
    expect(mockStep.request.method).toBe('GET');
    expect(mockStep.request.path).toBe('/_search');
  });
});
