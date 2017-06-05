module.exports = function ({ env, bundle }) {

  const pluginSlug = env.pluginInfo.sort()
  .map(p => ' *  - ' + p)
  .join('\n');

  const requires = bundle.modules
  .map(m => `require('${m}');`)
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

require('ui/chrome');
${requires}
require('ui/chrome').bootstrap(/* xoxo */);

`;

};
