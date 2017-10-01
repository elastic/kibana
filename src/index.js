#!/usr/bin/env node

const { init } = require('../src/cli');
const { getConfig } = require('./configs');
const { username, accessToken } = getConfig();

init({ username, accessToken });
