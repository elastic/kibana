import { esTestConfig } from '../../test_utils/es';

export const createTestEntryTemplate = (defaultUiSettings) => (bundle) => `
/**
 * Test entry file
 *
 * This is programatically created and updated, do not modify
 *
 * context: ${bundle.getContext()}
 *
 */

window.__KBN__ = {
  version: '1.2.3',
  buildNum: 1234,
  vars: {
    kbnIndex: '.kibana',
    esShardTimeout: 1500,
    esApiVersion: ${JSON.stringify(esTestConfig.getBranch())},
    esRequestTimeout: '300000',
    tilemapsConfig: {
      deprecated: {
        isOverridden: false,
        config: {
          options: {
          }
        }
      }
    },
    regionmapsConfig: {
      layers: []
    },
    mapConfig: {
      manifestServiceUrl: 'https://staging-dot-catalogue-dot-elastic-layer.appspot.com/v1/manifest'
    }
  },
  uiSettings: {
    defaults: ${JSON.stringify(defaultUiSettings, null, 2).split('\n').join('\n    ')},
    user: {}
  }
};

require('ui/test_harness');
${bundle.getRequires().join('\n')}
require('ui/test_harness').bootstrap(/* go! */);
`;
