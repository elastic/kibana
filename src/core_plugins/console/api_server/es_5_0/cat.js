let _ = require("lodash");

function addSimpleCat(endpoint, api, params, patterns) {
  var url_params = { "help": "__flag__", "v": "__flag__", "bytes": ["b"] };
  _.each(params || [], function (p) {
    if (_.isString(p)) {
      url_params[p] = "__flag__";
    }
    else {
      var k = Object.keys(p)[0];
      url_params[k] = p[k];
    }
  });
  api.addEndpointDescription(endpoint, {
    match: endpoint,
    url_params: url_params,
    patterns: patterns || [endpoint]
  });
}

function addNodeattrsCat(api) {
  api.addEndpointDescription('_cat/nodeattrs', {
    methods: ['GET'],
    patterns: [
      "_cat/nodeattrs"
    ],
    url_params: {
      help: "__flag__",
      v: "__flag__",
      h: ["node", "name", "id", "nodeId", "pid", "p", "host", "h", "ip", "i", "port", "po", "attr", "attr.name", "value", "attr.value"]
    }
  });
}

function addHelpCat(api) {
  api.addEndpointDescription('_cat', {
    methods: ['GET'],
    patterns: [
      '_cat'
    ],
    'url_params': {}
  })
}

export default function (api) {
  addHelpCat(api)

  addSimpleCat('_cat/aliases', api);
  addSimpleCat('_cat/allocation', api, null, ['_cat/allocation', '_cat/allocation/{nodes}']);
  addSimpleCat('_cat/count', api);
  addSimpleCat('_cat/fielddata', api, null, [
    '_cat/fielddata', '_cat/fielddata/{fields}'
  ]);
  addSimpleCat('_cat/health', api, [
    { "ts": ["false", "true"] }
  ]);
  addSimpleCat('_cat/indices', api, [
      { h: [] },
      "pri",
    ],
    ['_cat/indices', '_cat/indices/{indices}']);
  addSimpleCat('_cat/master', api);
  addNodeattrsCat(api);
  addSimpleCat('_cat/nodes', api);
  addSimpleCat('_cat/pending_tasks', api);
  addSimpleCat('_cat/plugins', api);
  addSimpleCat('_cat/recovery', api);
  addSimpleCat('_cat/repositories', api);
  addSimpleCat('_cat/thread_pool', api);
  addSimpleCat('_cat/shards', api);
  addSimpleCat('_cat/segments', api);
  addSimpleCat('_cat/snapshots', api, null, [
    '_cat/snapshots', '_cat/snapshots/{name}'
  ]);
  addSimpleCat('_cat/tasks', api);
  addSimpleCat('_cat/templates', api, [
    '_cat/templates', '_cat/templates/{name}'
  ]);
}
