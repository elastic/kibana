#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var nodeMajorVersion = parseFloat(process.version.replace(/^v(\d+)\..+/, '$1'));
if (nodeMajorVersion < 6) {
  console.error('FATAL: kibana-plugin-helpers requires node 6+');
  process.exit(1);
}

require('../cli');