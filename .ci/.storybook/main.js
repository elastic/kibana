/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const config = require('@kbn/storybook').defaultConfig;
const aliases = require('../../src/dev/storybook/aliases.ts').storybookAliases;

config.refs = {};

for(const alias of Object.keys(aliases).filter(a => a !== 'ci_composite')) {
  const title = alias
    .replace(/_/g, ' ')
    .split(' ')
    .map(n => n[0].toUpperCase()+n.slice(1) )
    .join(' ');

  config.refs[alias] = {
    title: title,
    url: 'TODO',
  }
}

console.log(config);

module.exports = config;
