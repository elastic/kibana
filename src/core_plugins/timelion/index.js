export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      app: {
        title: 'Timelion',
        order: -1000,
        description: 'Time series expressions for everything',
        icon: 'plugins/timelion/icon.svg',
        main: 'plugins/timelion/app',
        uses: [
          'fieldFormats',
          'savedObjectTypes'
        ]
      },
      hacks: [
        'plugins/timelion/lib/panel_registry',
        'plugins/timelion/panels/timechart/timechart'
      ],
      visTypes: [
        'plugins/timelion/vis'
      ],
      home: [
        'plugins/timelion/register_feature'
      ],
      mappings: require('./mappings.json'),

      uiSettingDefaults: {
        'timelion:showTutorial': {
          value: false,
          description: 'Should I show the tutorial by default when entering the timelion app?',
          category: 'timelion'
        },
        'timelion:es.timefield': {
          value: '@timestamp',
          description: 'Default field containing a timestamp when using .es()',
          category: 'timelion'
        },
        'timelion:es.default_index': {
          value: '_all',
          description: 'Default elasticsearch index to search with .es()',
          category: 'timelion'
        },
        'timelion:target_buckets': {
          value: 200,
          description: 'The number of buckets to shoot for when using auto intervals',
          category: 'timelion'
        },
        'timelion:max_buckets': {
          value: 2000,
          description: 'The maximum number of buckets a single datasource can return',
          category: 'timelion'
        },
        'timelion:default_columns': {
          value: 2,
          description: 'Number of columns on a timelion sheet by default',
          category: 'timelion'
        },
        'timelion:default_rows': {
          value: 2,
          description: 'Number of rows on a timelion sheet by default',
          category: 'timelion'
        },
        'timelion:min_interval': {
          value: '1ms',
          description: 'The smallest interval that will be calculated when using "auto"',
          category: 'timelion'
        },
        'timelion:graphite.url': {
          value: 'https://www.hostedgraphite.com/UID/ACCESS_KEY/graphite',
          description: '<em>[experimental]</em> The URL of your graphite host',
          category: 'timelion'
        },
        'timelion:quandl.key': {
          value: 'someKeyHere',
          description: '<em>[experimental]</em> Your API key from www.quandl.com',
          category: 'timelion'
        }
      }
    },
    init: require('./init.js'),
  });
}
