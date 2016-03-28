#!/usr/bin/env node

var movedFile = false;

if (["linux", "win32"].indexOf(process.platform) !== -1)
  return;

var fs = require('fs');
var path = require('path');

var src = path.join(__dirname, '..', 'compile.py');
var dst = path.join(__dirname, '..', 'binding.gyp');

fs.renameSync(src, dst);

movedFile = true;

//npm_execpath: '/usr/local/lib/node_modules/npm/bin/npm-cli.js',
var nodegyp = path.join(process.env.npm_execpath,
                        '..',
                        'node-gyp-bin',
                        'node-gyp');

if (!fs.existsSync(nodegyp))
  nodegyp = path.join(process.execPath,
                        '..',
                        '..',
                        'lib',
                        'node_modules',
                        'npm',
                        'bin',
                        'node-gyp-bin',
                        'node-gyp');

if (!fs.existsSync(nodegyp)) {
  console.error('cannot locate npm install');
  return;
}

var spawn = require('child_process').spawn;

var stdio = 'ignore';

if (process.env.V)
  stdio = 'inherit';

var options = {
  cwd: path.join(__dirname, '..'),
  stdio: stdio
};

var child = spawn(nodegyp, ['rebuild'], options);

child.on('close', function(code, signal) {
  if ((code || signal) && process.env.V === undefined) {
    console.error('---------------');
    console.error('Building dtrace-provider failed with exit code %d and signal %d',
                  code, signal);
    console.error('re-run install with environment variable V set to see the build output');
    console.error('---------------');
  }
  process.exit(0);
});

process.on('exit', function() {
  if (movedFile)
    fs.renameSync(dst, src);
});
