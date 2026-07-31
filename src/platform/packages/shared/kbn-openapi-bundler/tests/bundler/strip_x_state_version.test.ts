/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from '../create_oas_document';

const createSpecWithXState = (xState: string, labels: string[]): OpenAPIV3.Document =>
  createOASDocument({
    paths: {
      '/api/some_api': {
        get: {
          // @ts-expect-error custom properties are unexpected here
          'x-labels': labels,
          'x-state': xState,
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  });

const getOperationXState = (spec: OpenAPIV3.Document): unknown =>
  // @ts-expect-error `x-state` is a custom property
  spec.paths['/api/some_api']?.get?.['x-state'];

describe('OpenAPI Bundler - strip x-state version for serverless', () => {
  describe('serverless bundle', () => {
    it.each([
      // Tier + version: the version is stripped, the tier is preserved.
      { input: 'Generally available; added in 9.5.0', expected: 'Generally available' },
      { input: 'Generally available; Added in 9.5.0', expected: 'Generally available' },
      { input: 'Technical Preview; added in 9.4.0', expected: 'Technical Preview' },
      { input: 'Experimental; added in 9.6.0', expected: 'Experimental' },
      // Bare version (no tier): nothing is left, matching getXState's empty serverless state.
      { input: 'Added in 9.5.0', expected: '' },
      { input: 'added in 9.5.0', expected: '' },
      // No version: left untouched.
      { input: 'Generally available', expected: 'Generally available' },
      { input: 'Technical Preview', expected: 'Technical Preview' },
      { input: '', expected: '' },
    ])('rewrites "$input" to "$expected"', async ({ input, expected }) => {
      const spec = createSpecWithXState(input, ['serverless']);

      const [bundledSpec] = Object.values(
        await bundleSpecs({ 1: spec }, { includeLabels: ['serverless'] })
      );

      expect(getOperationXState(bundledSpec)).toBe(expected);
    });
  });

  describe('non-serverless bundle', () => {
    it.each([
      'Generally available; added in 9.5.0',
      'Technical Preview; added in 9.4.0',
      'Added in 9.5.0',
    ])('preserves "%s" verbatim for the ess bundle', async (input) => {
      const spec = createSpecWithXState(input, ['ess']);

      const [bundledSpec] = Object.values(
        await bundleSpecs({ 1: spec }, { includeLabels: ['ess'] })
      );

      expect(getOperationXState(bundledSpec)).toBe(input);
    });
  });
});
