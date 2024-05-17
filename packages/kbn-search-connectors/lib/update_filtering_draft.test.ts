/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { errors } from '@elastic/elasticsearch';

import { updateFilteringDraft } from './update_filtering_draft';
import { FilteringRule, FilteringRules, FilteringValidationState } from '../types/connectors';

describe('updateFilteringDraft lib function', () => {
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

  it('should update connector filtering draft', async () => {
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

    const draft: FilteringRules = {
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
        state: FilteringValidationState.EDITED,
      },
    };

    mockClient.transport.request.mockImplementationOnce(() => ({ result: 'updated' }));
    mockClient.transport.request.mockImplementationOnce(() => ({ filtering: [{ draft }] }));

    await expect(
      updateFilteringDraft(mockClient as unknown as ElasticsearchClient, 'connectorId', {
        advancedSnippet: '{}',
        filteringRules: [filteringRule],
      })
    ).resolves.toEqual(draft);
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      body: {
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
      },
      method: 'PUT',
      path: '/_connector/connectorId/_filtering',
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
      updateFilteringDraft(mockClient as unknown as ElasticsearchClient, 'connectorId', {
        advancedSnippet: '{}',
        filteringRules: [],
      })
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
