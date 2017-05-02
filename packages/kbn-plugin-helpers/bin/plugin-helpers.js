#!/usr/bin/env node

const nodeMajorVersion = parseFloat(process.version.replace(/^v(\d+)\..+/, '$1'));
if (nodeMajorVersion < 6) {
  console.error('FATAL: kibana-plugin-helpers requires node 6+');
  process.exit(1);
}

require('../cli');
