module.exports = function (api) {
  api.addGlobalAutocompleteRules('facets', {
    '*': {
      terms: {
        __template: {
          field: 'FIELD',
          size: 10
        },
        field: '{field}',
        fields: ['{field}'],
        size: 10,
        script: '',
        script_field: '',
        order: {
          __one_of: ['count', 'term', 'reverse_count', 'reverse_term']
        },
        all_terms: {
          __one_of: [false, true]
        },
        exclude: ['TERM'],
        regex: '',
        regex_flags: ''
      },
      range: {
        __template: {
          field: 'FIELD',
          ranges: [
            {
              'to': 50
            },
            {
              'from': 20,
              'to': 70
            },
            {
              'from': 70,
              'to': 120
            },
            {
              'from': 150
            }
          ]
        },
        field: '{field}',
        ranges: [
          {
            to: 10,
            from: 20
          }
        ]
      },
      histogram: {
        __template: {
          field: 'FIELD',
          interval: 100
        },
        field: '{field}',
        interval: 100,
        time_interval: '1.5h',
        key_field: '{field}',
        value_field: '{field}',
        key_script: '',
        value_script: '',
        params: {}
      },
      date_histogram: {
        __template: {
          field: 'FIELD',
          'interval': 'day'
        },
        field: '{field}',
        interval: {
          __one_of: ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', '1h', '1d', '1w']
        },
        post_zone: -1,
        pre_zone: -1,
        factor: 1000,
        pre_offset: '1d',
        post_offset: '1d',
        key_field: '{field}',
        value_field: '{field}',
        value_script: ''
      },
      filter: {},
      query: {},
      facet_filter: {
        __scope_link: 'GLOBAL.filter'
      },
      statistical: {
        __template: {
          field: 'FIELD'
        },
        field: '{field}',
        fields: ['{field}'],
        script: ''
      },
      terms_stats: {
        __template: {
          key_field: 'FIELD',
          value_field: 'FIELD'
        },
        key_field: '{field}',
        value_field: '{field}',
        value_script: '',
        size: 10,
        order: {
          __one_of: ['count', 'term', 'reverse_term', 'reverse_count', 'total', 'reverse_total',
            'min', 'reverse_min', 'max', 'reverse_max', 'mean', 'reverse_mean'
          ]
        }
      }
    }
  });
};
