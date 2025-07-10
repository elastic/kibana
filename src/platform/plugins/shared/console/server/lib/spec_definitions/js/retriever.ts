/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SpecDefinitionsService } from '../../../services';

export const retriever = (specService: SpecDefinitionsService) => {
  specService.addGlobalAutocompleteRules('retriever', {
    knn: {
      __template: {
        field: '',
        query_vector_builder: {
          text_embedding: {
            model_id: '',
            model_text: '',
          },
        },
        k: 10,
        num_candidates: 100,
      },
      filter: {
        __scope_link: 'GLOBAL.query',
      },
      field: '{field}',
      query_vector: [],
      similarity: { __one_of: ['l2_norm', 'cosine', 'dot_product', 'max_inner_product'] },
      rescore_vector: {
        oversample: 1.5,
      },
    },
    linear: {
      __template: {
        retrievers: [{}],
      },
      rank_window_size: 100,
      filter: {
        __scope_link: 'GLOBAL.query',
      },
      retrievers: {
        __any_of: [
          {
            retriever: {
              __scope_link: '.',
            },
            weight: 2,
            normalizer: { __one_of: ['minmax', 'l2_norm', 'none'] },
          },
        ],
      },
    },
    rescorer: {
      __template: {
        rescore: {
          query: {
            rescore_query: {},
          },
        },
        retriever: {},
      },
      filter: {
        __scope_link: 'GLOBAL.query',
      },
      retriever: {
        __scope_link: '.',
      },
      rescore: {
        query: {
          rescore_query: {
            __scope_link: 'GLOBAL.query',
          },
        },
        window_size: 50,
      },
    },
    rrf: {
      __template: {
        retrievers: [{}],
      },
      retrievers: [
        {
          __scope_link: '.',
        },
      ],
      filter: {
        __scope_link: 'GLOBAL.query',
      },
      rank_constant: 60,
      rank_window_size: 100,
    },
    rule: {
      __template: {
        retriever: {},
        ruleset_ids: [],
        match_criteria: {},
      },
      retriever: {
        __scope_link: '.',
      },
      ruleset_ids: [],
      match_criteria: {},
      rank_window_size: 10,
    },
    pinned: {
      __template: {
        retriever: {},
        ids: [],
        match_criteria: {},
      },
      retriever: {
        __scope_link: '.',
      },
      // Only one of 'ids' or 'docs' should be used at a time
      ids: [],
      docs: [],
      match_criteria: {},
      rank_window_size: 10,
    },
    standard: {
      __template: {
        query: {},
      },
      query: {
        __scope_link: 'GLOBAL.query',
      },
      filter: {
        __scope_link: 'GLOBAL.query',
      },
      collapse: {
        __template: {
          field: 'FIELD',
        },
      },
      min_score: 0,
      search_after: [],
      sort: {},
      terminate_after: 10000,
    },
    text_similarity_reranker: {
      __template: {
        retriever: {},
        inference_id: '',
        inference_text: '',
        field: '',
      },
      retriever: {
        __scope_link: '.',
      },
      inference_id: '',
      inference_text: '',
      field: '{field}',
      rank_window_size: 10,
      min_score: 0,
      filter: {
        __scope_link: 'GLOBAL.query',
      },
    },
    simplified_linear: {
      __template: {
        query: "search terms",
        fields: ["field1", "field2^2"],
        normalizer: "minmax"
      },
      query: "",
      fields: [],
      normalizer: { __one_of: ['minmax', 'l2_norm', 'none'] },
      rank_window_size: 100,
      filter: {
        __scope_link: 'GLOBAL.query'
      }
    },
    simplified_rrf: {
      __template: {
        query: "search terms",
        fields: ["field1", "field2"]
      },
      query: "",
      fields: [],
      rank_constant: 60,
      rank_window_size: 100,
      filter: {
        __scope_link: 'GLOBAL.query',
      },
    },
  });
};
