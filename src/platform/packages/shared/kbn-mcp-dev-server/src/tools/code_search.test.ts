/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { codeSearchTool } from './code_search';
import { client } from '../utils/elasticsearch';

jest.mock('../utils/elasticsearch', () => ({
  client: {
    search: jest.fn(),
  },
}));

describe('codeSearchTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the search method with the correct parameters', async () => {
    const mockSearch = jest.fn().mockResolvedValue({
      hits: {
        hits: [],
      },
    });
    (client.search as jest.Mock) = mockSearch;

    await codeSearchTool.handler({ query: 'test query', size: 10, page: 1 });
    expect(mockSearch).toHaveBeenCalledWith({
      index: 'kibana-code-search',
      size: 10,
      from: 0,
      _source: [
        'filePath',
        'content',
        'kind',
        'language',
        'startLine',
        'endLine',
        'git_branch',
        'git_file_hash',
        'chunk_hash',
        'created_at',
        'updated_at',
        'type',
        'imports',
      ],
      query: {
        bool: {
          must: [
            {
              sparse_vector: {
                field: 'content_embedding',
                inference_id: '.elser_model_2',
                query: 'test query',
              },
            },
          ],
        },
      },
    });
  });

  it('calls the search method with the correct parameters when kql is provided', async () => {
    const mockSearch = jest.fn().mockResolvedValue({
      hits: {
        hits: [],
      },
    });
    (client.search as jest.Mock) = mockSearch;

    await codeSearchTool.handler({
      query: 'test query',
      kql: 'language:typescript',
      size: 20,
      page: 2,
    });
    expect(mockSearch).toHaveBeenCalledWith({
      index: 'kibana-code-search',
      size: 20,
      from: 20,
      _source: [
        'filePath',
        'content',
        'kind',
        'language',
        'startLine',
        'endLine',
        'git_branch',
        'git_file_hash',
        'chunk_hash',
        'created_at',
        'updated_at',
        'type',
        'imports',
      ],
      query: {
        bool: {
          must: [
            {
              sparse_vector: {
                field: 'content_embedding',
                inference_id: '.elser_model_2',
                query: 'test query',
              },
            },
            {
              bool: {
                should: [
                  {
                    match: {
                      language: 'typescript',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    });
  });
});
