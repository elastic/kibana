const { defaultConfig } = require('@kbn/storybook');
const { storybookAliases } = require('../../../../src/dev/storybook/aliases');

const m = {
  dashboard_enhanced: 'dashboard-enhanced',
  infra: 'infra-neon',
};

const urlSuffix = 'vercel.app';
const refs = Object.entries(storybookAliases).reduce((prev, [id, options]) => {
  if (id !== 'composite') {
    prev[id] = { title: options.title || id, url: `https://${m[id]}.${urlSuffix}` };
  }
  return prev;
}, {});

console.log({ refs, storybookAliases });

// console.log({ refs });
// process.exit(0);
module.exports = {
  ...defaultConfig,
  refs,
  stories: [],
};
