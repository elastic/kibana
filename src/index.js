#!/usr/bin/env node

const { init } = require('./cli');
const { getConfig } = require('./configs');
const config = getConfig();

init(config, {
  cwd: process.cwd()
});
