#!/usr/bin/env node

//process.env.NODE_DEBUG = 'net';
//process.env.NODE_DEBUG = 'request';

var _ = require('lodash');
var program = require('commander');
require('../lib/commanderExtensions.js')(program);
var path = require('path');
var startupOptions = require('./startup/startup_options.js');
var startup = require('./startup/startup.js');
var pluginProgram = require('./plugin/plugin');

var env = (process.env.NODE_ENV) ? process.env.NODE_ENV : 'development';
var packagePath = path.resolve(__dirname, '..', '..', '..', 'package.json');
if (env !== 'development') {
  packagePath = path.resolve(__dirname, '..', 'package.json');
}
var package = require(packagePath);

program.description('Kibana is an open source (Apache Licensed), browser based analytics and search dashboard for Elasticsearch.');
program.version(package.version);

startupOptions(program);
pluginProgram(program);

program.parse(process.argv);

if (!program.isCommandSpecified()) {
  startup(program);
}