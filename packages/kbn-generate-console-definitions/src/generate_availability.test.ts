/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

  const mockAvailability: SpecificationTypes.Availability = {
    since: '7.7.0',
    stability: SpecificationTypes.Stability.stable,
  };

  it('throws an error if `availability` if missing in the endpoint object', () => {
    const endpointWithoutAvailability = {
      ...mockEndpoint,
      availability: undefined,
    };

    // @ts-expect-error according to types, availability is never missing
    expect(() => generateAvailability(endpointWithoutAvailability)).toThrow(
      'missing availability for test-endpoint'
    );
  });

  describe('converts to false if the availability object is missing for either stack or serverless', () => {
    it('if availability for stack is missing, the endpoint is not available there', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          serverless: mockAvailability,
        },
      };

      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: false,
        serverless: true,
      });
    });

    it('if availability for serverless is missing, the endpoint is not available there', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          stack: mockAvailability,
        },
      };

      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: true,
        serverless: false,
      });
    });
  });

  describe('converts to true if the availability object is present and visibility is not set (public by default)', () => {
    it('if availability for stack is set and its visibility is not set, the endpoint is available there', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          stack: mockAvailability,
        },
      };
      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: true,
        serverless: false,
      });
    });

    it('if availability for serverless is set and its visibility is not set, the endpoint is available there', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          serverless: mockAvailability,
        },
      };
      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: false,
        serverless: true,
      });
    });
  });

  describe('checks visibility value if the availability object is present and visibility is set', () => {
    it('if visibility is set to public', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          stack: { ...mockAvailability, visibility: SpecificationTypes.Visibility.public },
          serverless: {
            ...mockAvailability,
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

    it('if visibility is set to private', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          stack: { ...mockAvailability, visibility: SpecificationTypes.Visibility.private },
          serverless: { ...mockAvailability, visibility: SpecificationTypes.Visibility.private },
        },
      };
      const availability = generateAvailability(endpoint);
      expect(availability).toEqual({
        stack: false,
        serverless: false,
      });
    });

    it('if visibility is set to feature_flag', () => {
      const endpoint = {
        ...mockEndpoint,
        availability: {
          stack: { ...mockAvailability, visibility: SpecificationTypes.Visibility.feature_flag },
          serverless: {
            ...mockAvailability,
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
  });
});
