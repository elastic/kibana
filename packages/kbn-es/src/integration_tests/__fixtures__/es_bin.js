#!/usr/bin/env node

const { exitCode, start } = JSON.parse(process.argv[2]);

if (start) {
  console.log('started');
}

process.exitCode = exitCode;
