/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SpecificationTypes } from './types';
import { generateAvailability } from './generate_availability';

describe('generateAvailability', () => {
  const mockEndpoint: SpecificationTypes.Endpoint = {
    name: 'test-endpoint',
    description: 'test-endpoint',
    docUrl: 'test-endpoint',
    availability: {},
    request: null,
    requestBodyRequired: false,
    response: null,
    urls: [],
  };

  it('converts empty availability to true for stack, false for serverless', () => {
    const endpoint = mockEndpoint;

    const availability = generateAvailability(endpoint);
    expect(availability).toEqual({
      stack: true,
      serverless: false,
    });
  });

  describe('converts correctly stack visibility', function () {
    it('public visibility to true', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          stack: {
            visibility: SpecificationTypes.Visibility.public,
          },
        },
      };

      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: true,
        serverless: false,
      });
    });

    it('private visibility to false', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          stack: {
            visibility: SpecificationTypes.Visibility.private,
          },
        },
      };

      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: false,
        serverless: false,
      });
    });

    it('feature_flag visibility to false', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          stack: {
            visibility: SpecificationTypes.Visibility.feature_flag,
          },
        },
      };

      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: false,
        serverless: false,
      });
    });

    it('missing visibility to true', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          stack: {},
        },
      };

      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: true,
        serverless: false,
      });
    });
  });

  describe('converts correctly serverless visibility', function () {
    it('public visibility to true', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          serverless: {
            visibility: SpecificationTypes.Visibility.public,
          },
        },
      };

      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: true,
        serverless: true,
      });
    });

    it('private visibility to false', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          serverless: {
            visibility: SpecificationTypes.Visibility.private,
          },
        },
      };

      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: true,
        serverless: false,
      });
    });

    it('feature_flag visibility to false', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          serverless: {
            visibility: SpecificationTypes.Visibility.feature_flag,
          },
        },
      };

      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: true,
        serverless: false,
      });
    });

    it('missing visibility to true for stack, false for serverless', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          serverless: {},
        },
      };

      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: true,
        serverless: false,
      });
    });
  });
});
