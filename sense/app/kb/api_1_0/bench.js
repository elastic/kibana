define(function () {
  'use strict';
  return function init(api) {


    api.addEndpointDescription('_put_bench', {
      methods: ['PUT'],
      patterns: ['_bench'],
      data_autocomplete_rules: {
        name: '',
        percentiles: [],
        num_executor_nodes: 1,
        competitors: [{
          __template: {
            name: '',
            requests: [{query:{}}]
          },
          name: '',
          requests: [
            { 
            __template: {
              query: {}
            },
            query: {}
          }
          ],
          iterations: 5,
          concurrency: 5,
          multiplier: 1000,
          warmup: { __one_of: [true, false] },
          num_slowset: 1, 
          search_type: { __one_of: ['query_then_fetch', 'dfs_query_then_fetch', 'count'] },
          clear_caches: {
            filter: { __one_of: [true, false] },
            field_data: { __one_of: [true, false] },
            id: { __one_of: [true, false] }, 
            recycler: { __one_of: [true, false] }, 
            fields: ['{fields}'], 
            filter_keys: { __one_of: [true, false] } 
          },
          indices: ['{indices}']
        }]
      }
    });
  };
});
