module.exports = function ({env, bundle}) {

  let pluginSlug = env.pluginInfo.sort()
  .map(p => ' *  - ' + p)
  .join('\n');

  let requires = bundle.modules
  .map(m => `require('${m}');`)
  .join('\n');

  return `
/**
 * Test entry file
 *
 * This is programatically created and updated, do not modify
 *
 * context: <%= JSON.stringify(env.context) %>
 * includes code from:
${pluginSlug}
 *
 */

window.__KBN__ = {
  vars: {
    kbnIndex: '.kibana',
    esShardTimeout: 1500,
    esApiVersion: '2.0',
  }
};

require('ui/testHarness');
${requires}
require('ui/testHarness').bootstrap(/* go! */);

`;

};
