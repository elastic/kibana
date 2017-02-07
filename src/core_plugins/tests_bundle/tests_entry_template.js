module.exports = function ({ env, bundle }) {

  const pluginSlug = env.pluginInfo.sort()
    .map(p => ' *  - ' + p)
    .join('\n');

  const requires = bundle.modules
    .map(m => `require(${JSON.stringify(m)});`)
    .join('\n');

  return `
/**
 * Test entry file
 *
 * This is programatically created and updated, do not modify
 *
 * context: ${JSON.stringify(env.context)}
 * includes code from:
${pluginSlug}
 *
 */

window.__KBN__ = {
  version: '1.2.3',
  buildNum: 1234,
  vars: {
    kbnIndex: '.kibana',
    esShardTimeout: 1500,
    esApiVersion: '5.x',
    esRequestTimeout: '300000',
    tilemapsConfig: {
      deprecated: {
        isOverridden: true,
        config: {
          url: 'https://tiles.elastic.co/v1/default/{z}/{x}/{y}.png?my_app_name=kibana&my_app_version=1.2.3&elastic_tile_service_tos=agree',
          options: {
            minZoom: 1,
            maxZoom: 10,
            attribution: '© [Elastic Tile Service](https://www.elastic.co/elastic_tile_service)'
          }
        }        
      },
      manifestServiceUrl: 'https://proxy-tiles.elastic.co/v1/manifest'
    }
  },
  uiSettings: {
    defaults: ${JSON.stringify(env.defaultUiSettings, null, 2).split('\n').join('\n    ')},
    user: {}
  }
};

require('ui/test_harness');
${requires}
require('ui/test_harness').bootstrap(/* go! */);
`;

};
