/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const config = require('@kbn/storybook').defaultConfig;
const aliases = require('../../src/dev/storybook/aliases.ts').storybookAliases;

config.refs = {};

for (const alias of Object.keys(aliases).filter((a) => a !== 'ci_composite')) {
  // snake_case -> Title Case
  const title = alias
    .replace(/_/g, ' ')
    .split(' ')
    .map((n) => n[0].toUpperCase() + n.slice(1))
    .join(' ');

  config.refs[alias] = {
    title: title,
    url: `${process.env.STORYBOOK_BASE_URL}/${alias}`,
  };
}

module.exports = config;
