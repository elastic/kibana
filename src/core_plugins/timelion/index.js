
export default function (kibana) {
  let mainFile = 'plugins/timelion/app';

  const ownDescriptor = Object.getOwnPropertyDescriptor(kibana, 'autoload');
  const protoDescriptor = Object.getOwnPropertyDescriptor(kibana.constructor.prototype, 'autoload');
  const descriptor = ownDescriptor || protoDescriptor || {};
  if (descriptor.get) {
    // the autoload list has been replaced with a getter that complains about
    // improper access, bypass that getter by seeing if it is defined
    mainFile = 'plugins/timelion/app_with_autoload';
  }

  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      app: {
        title: 'Timelion',
        order: -1000,
        description: 'Time series expressions for everything',
        icon: 'plugins/timelion/icon.svg',
        main: mainFile,
        injectVars: function (server) {
          const config = server.config();
          return {
            kbnIndex: config.get('kibana.index'),
            esShardTimeout: config.get('elasticsearch.shardTimeout'),
            esApiVersion: config.get('elasticsearch.apiVersion')
          };
        },
        uses: [
          'savedObjectTypes',
        ]
      },
      hacks: [
        'plugins/timelion/lib/panel_registry',
        'plugins/timelion/panels/timechart/timechart'
      ],
      visTypes: [
        'plugins/timelion/vis'
      ],
      mappings: require('./mappings.json'),

      uiSettingDefaults: {
        'timelion:showTutorial': {
          value: false,
          description: 'Should I show the tutorial by default when entering the timelion app?'
        },
        'timelion:es.timefield': {
          value: '@timestamp',
          description: 'Default field containing a timestamp when using .es()'
        },
        'timelion:es.default_index': {
          value: '_all',
          description: 'Default elasticsearch index to search with .es()'
        },
        'timelion:target_buckets': {
          value: 200,
          description: 'The number of buckets to shoot for when using auto intervals'
        },
        'timelion:max_buckets': {
          value: 2000,
          description: 'The maximum number of buckets a single datasource can return'
        },
        'timelion:default_columns': {
          value: 2,
          description: 'Number of columns on a timelion sheet by default'
        },
        'timelion:default_rows': {
          value: 2,
          description: 'Number of rows on a timelion sheet by default'
        },
        'timelion:min_interval': {
          value: '1ms',
          description: 'The smallest interval that will be calculated when using "auto"'
        },
        'timelion:graphite.url': {
          value: 'https://www.hostedgraphite.com/UID/ACCESS_KEY/graphite',
          description: '<em>[experimental]</em> The URL of your graphite host'
        },
        'timelion:quandl.key': {
          value: 'someKeyHere',
          description: '<em>[experimental]</em> Your API key from www.quandl.com'
        }
      }
    },
    init: require('./init.js'),
  });
}
