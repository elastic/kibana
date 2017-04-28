module.exports = function (api) {

  api.addEndpointDescription('_post_reindex', {
    methods: [ 'POST' ],
    patterns: [
      '_reindex'
    ],
    url_params: {
      refresh: '__flag__',
      wait_for_completion: 'true',
      wait_for_active_shards: 1,
      timeout: '1m',
      requests_per_second: 0,
      slices: 1
    },
    data_autocomplete_rules: {
      __template: {
        'source': {},
        'dest': {}
      },
      'source': {
        'index': '',
        'type': '',
        'query': {
          __scope_link: 'GLOBAL.query'
        },
        'sort': {
          __template: {
            'FIELD': 'desc'
          },
          'FIELD': { __one_of: [ 'asc', 'desc' ] }
        },
        'size': 1000,
        'remote': {
          __template: {
            'host': '',
          },
          'host': '',
          'username': '',
          'password': '',
          'socket_timeout': '30s',
          'connect_timeout': '30s'
        }
      },
      'dest': {
        'index': '',
        'version_type': { __one_of: [ 'internal', 'external' ] },
        'op_type': 'create',
        'routing': { __one_of: [ 'keep', 'discard', '=SOME TEXT'] },
        'pipeline': ''
      },
      'conflicts': 'proceed',
      'size': 10,
      'script': { __scope_link: 'GLOBAL.script' },
    }
  })
};