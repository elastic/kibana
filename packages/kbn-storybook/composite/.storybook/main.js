const { defaultConfig } = require('@kbn/storybook');
const { storybookAliases } = require('../../../../src/dev/storybook/aliases');

const urlAliases = {
  dashboard_enhanced: 'dashboard-enhanced',
};
const urlSuffix = 'nlsmith.vercel.app';

const refs = Object.entries(storybookAliases).reduce((prev, [id, options]) => {
  if (id !== 'composite') {
    prev[id] = { title: options.title || id, url: `https://${urlAliases[id] || id}.${urlSuffix}` };
  }
  return prev;
}, {});

// console.log({ refs });
// process.exit(0);
module.exports = {
  ...defaultConfig,
  refs,
  stories: [],
};
