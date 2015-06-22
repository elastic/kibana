#!/usr/bin/env node
'use strict';
var nopt = require('nopt');
var path = require('path');
var chalk = require('chalk');
var sudoBlock = require('sudo-block');
var updateNotifier = require('update-notifier');
var pkg = require('../package.json');
var project = require('../lib');

var opts = nopt({
  help: Boolean,
  version: Boolean,
  config: path,
  exclude: Array,
  'base-url': path,
  baseUrl: path, // alias for --base-url
  transitive: Boolean,
  'exclude-dev': Boolean
}, {
  h: '--help',
  v: '--version',
  c: '--config',
  e: '--exclude',
  b: '--base-url',
  t: '--transitive',
  d: '--exclude-dev'
});

if (opts['base-url']) {
  opts.baseUrl = opts['base-url'];
}

function init() {
  project(opts);
}

function help() {
  var out = [
    'Usage: bower-requirejs [options]',
    '',
    'General options:',
    '  -h, --help              # Print options and usage',
    '  -v, --version           # Print the version number',
    '  -c, --config            # Path to your RequireJS config file',
    '  -e, --exclude           # Name of a dependency to be excluded from the process',
    '  -b, --base-url          # Path which all dependencies will be relative to',
    '  -t, --transitive        # Process transitive dependencies',
    '  -d, --exclude-dev       # Exclude devDependencies',
    ''
  ];

  return out.join('\n');
}

function rootCheck() {
  var msg = [
    chalk.red('Easy with the `sudo` :)'),
    'Since bower-requirejs is a user command, there is no need to execute it with superuser',
    'permissions. If you\'re having permission errors when using bower-requirejs without sudo',
    'please spend a few minutes learning more about how your system should work',
    'and make any necessary repairs.',
    '',
    'http://www.joyent.com/blog/installing-node-and-npm',
    'https://gist.github.com/isaacs/579814'
  ];

  sudoBlock({message: msg.join('\n')});
}

function pre() {
  if (opts.version) {
    return console.log(pkg.version);
  }

  if (opts.help) {
    return console.log(help());
  }

  init();
}

if (opts['update-notifier'] !== false) {
  updateNotifier({
    packageName: pkg.name,
    packageVersion: pkg.version
  }).notify();
}

rootCheck();
pre();
