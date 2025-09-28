/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractDimensions } from './extract_dimensions';
import { getEcsFieldDescriptions } from '../fields/get_ecs_field_descriptions';

jest.mock('../fields/get_ecs_field_descriptions', () => ({
  getEcsFieldDescriptions: jest.fn(),
}));

describe('extractDimensions', () => {
  const mockFields = {
    'host.name': {
      keyword: {
        aggregatable: true,
        searchable: true,
        type: 'keyword',
        time_series_dimension: true,
      },
    },
    'cloud.provider': {
      keyword: {
        aggregatable: true,
        searchable: true,
        type: 'keyword',
        time_series_dimension: true,
        meta: {
          description: ['The cloud provider'],
        },
      },
    },
    'service.name': {
      keyword: {
        aggregatable: true,
        searchable: true,
        type: 'keyword',
        time_series_dimension: true,
      },
    },
    'process.pid': {
      number: {
        aggregatable: true,
        searchable: true,
        type: 'number',
        time_series_dimension: false,
      },
    },
    'host.ip': {
      ip: {
        aggregatable: true,
        searchable: true,
        type: 'ip',
        time_series_dimension: true,
      },
    },
    _metric_names_hash: {
      keyword: {
        aggregatable: true,
        searchable: true,
        type: 'keyword',
        time_series_dimension: true,
      },
    },
  };

  beforeEach(() => {
    (getEcsFieldDescriptions as jest.Mock).mockReturnValue(
      new Map([['service.name', 'The service name']])
    );
  });

  it('should extract all dimensions when no filter is provided', () => {
    const result = extractDimensions(mockFields);
    expect(result).toEqual([
      {
        name: 'host.name',
        type: 'keyword',
        description: undefined,
      },
      {
        name: 'cloud.provider',
        type: 'keyword',
        description: 'The cloud provider',
      },
      {
        name: 'service.name',
        type: 'keyword',
        description: 'The service name',
      },
      {
        name: 'host.ip',
        type: 'ip',
        description: undefined,
      },
    ]);
  });

  it('should extract only filtered dimensions', () => {
    const result = extractDimensions(mockFields, ['host.name', 'service.name']);
    expect(result).toEqual([
      {
        name: 'host.name',
        type: 'keyword',
        description: undefined,
      },
      {
        name: 'service.name',
        type: 'keyword',
        description: 'The service name',
      },
    ]);
  });

  it('should return an empty array when no fields are dimensions', () => {
    const result = extractDimensions({
      'process.pid': {
        number: {
          aggregatable: true,
          searchable: true,
          type: 'number',
          time_series_dimension: false,
        },
      },
    });
    expect(result).toEqual([]);
  });

  it('should return an empty array when fields are empty', () => {
    const result = extractDimensions({});
    expect(result).toEqual([]);
  });

  it('should handle multiple types for a field', () => {
    const fieldsWithMultipleTypes = {
      'host.name': {
        keyword: {
          aggregatable: true,
          searchable: true,
          type: 'keyword',
          time_series_dimension: true,
        },
        text: {
          aggregatable: false,
          searchable: true,
          type: 'text',
          time_series_dimension: false,
        },
      },
    };
    const result = extractDimensions(fieldsWithMultipleTypes);
    expect(result).toEqual([
      {
        name: 'host.name',
        type: 'keyword',
        description: undefined,
      },
    ]);
  });
});
