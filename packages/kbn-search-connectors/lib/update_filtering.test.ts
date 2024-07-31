/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { errors } from '@elastic/elasticsearch';

import { updateFiltering } from './update_filtering';
import { FilteringRule, FilteringRules, FilteringValidationState } from '../types/connectors';

describe('updateFiltering lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-05-25T12:00:00.000Z'));
  });

  it('should activate connector filtering draft', async () => {
    const filteringRule: FilteringRule = {
      updated_at: '2024-05-10T12:14:14.291Z',
      created_at: '2024-05-09T14:37:56.090Z',
      field: 'name',
      id: 'my-rule',
      order: 0,
      policy: 'exclude',
      rule: 'regex',
      value: 'test.*',
    };

    const draftToActivate: FilteringRules = {
      advanced_snippet: {
        created_at: '2024-05-25T12:00:00.000Z',
        updated_at: '2024-05-25T12:00:00.000Z',
        value: {},
      },
      rules: [
        {
          ...filteringRule,
          updated_at: '2024-05-25T12:00:00.000Z',
        },
      ],
      validation: {
        errors: [],
        state: FilteringValidationState.VALID,
      },
    };

    mockClient.transport.request.mockImplementationOnce(() => ({ result: 'updated' }));
    mockClient.transport.request.mockImplementationOnce(() => ({
      filtering: [{ active: draftToActivate }],
    }));

    await expect(
      updateFiltering(mockClient as unknown as ElasticsearchClient, 'connectorId')
    ).resolves.toEqual(draftToActivate);
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_connector/connectorId/_filtering/activate',
    });
  });

  it('should not index document if there is no connector', async () => {
    mockClient.transport.request.mockImplementationOnce(() => {
      return Promise.reject(
        new errors.ResponseError({
          statusCode: 404,
          body: {
            error: {
              type: `document_missing_exception`,
            },
          },
        } as any)
      );
    });
    await expect(
      updateFiltering(mockClient as unknown as ElasticsearchClient, 'connectorId')
    ).rejects.toEqual(
      new errors.ResponseError({
        statusCode: 404,
        body: {
          error: {
            type: `document_missing_exception`,
          },
        },
      } as any)
    );
  });
});
