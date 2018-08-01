/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@codesearch/esqueue';

import { Document, DocumentSearchRequest, DocumentSearchResult } from '../../model';
import { DocumentIndexNamePrefix } from '../indexer/schema';
import { Log } from '../log';
import { AbstractSearchClient } from './abstract_search_client';

export class DocumentSearchClient extends AbstractSearchClient {
  constructor(protected readonly client: EsClient, protected readonly log: Log) {
    super(client, log);
  }

  public async search(req: DocumentSearchRequest): Promise<DocumentSearchResult> {
    const from = (req.page - 1) * req.resultsPerPage;
    const size = req.resultsPerPage;
    const rawRes = await this.client.search({
      index: `${DocumentIndexNamePrefix}*`,
      body: {
        from,
        size,
        query: {
          bool: {
            should: [
              {
                constant_score: {
                  filter: {
                    match: {
                      qnames: {
                        query: req.query,
                        operator: 'OR',
                        prefix_length: 0,
                        max_expansions: 50,
                        fuzzy_transpositions: true,
                        lenient: false,
                        zero_terms_query: 'NONE',
                        boost: 1.0,
                      },
                    },
                  },
                  boost: 1.0,
                },
              },
              {
                simple_query_string: {
                  query: req.query,
                  fields: ['content^1.0', 'path^1.0'],
                  default_operator: 'or',
                  lenient: false,
                  analyze_wildcard: false,
                  boost: 1.0,
                },
              },
            ],
            disable_coord: false,
            adjust_pure_negative: true,
            boost: 1.0,
          },
        },
        post_filter: {
          bool: {
            must: [
              {
                bool: {
                  disable_coord: false,
                  adjust_pure_negative: true,
                  boost: 1.0,
                },
              },
            ],
            disable_coord: false,
            adjust_pure_negative: true,
            boost: 1.0,
          },
        },
        highlight: {
          // TODO: we might need to improve the highlightin separator.
          pre_tags: ['_@_'],
          post_tags: ['_@_'],
          fields: {
            content: {},
            path: {},
          },
        },
      },
    });

    const hits: any[] = rawRes.hits.hits;
    const docs: Document[] = hits.map(hit => {
      const doc: Document = hit._source;
      return doc;
    });
    const highlights = hits.map(hit => {
      return hit.highlight;
    });
    const result: DocumentSearchResult = {
      documents: docs,
      highlights,
      took: rawRes.took,
      total: rawRes.hits.total,
    };
    return result;
  }
}
