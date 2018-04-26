const { promisify } = require('util');
const { exec } = require('child_process');
const fs = require('fs');
const mkdirp = require('mkdirp');

const execAsPromised = promisify(exec);

module.exports = {
  exec: (cmd, options) =>
    execAsPromised(cmd, { maxBuffer: 100 * 1024 * 1024, ...options }),
  writeFile: promisify(fs.writeFile),
  readFile: promisify(fs.readFile),
  stat: promisify(fs.stat),
  statSync: fs.statSync,
  mkdirp: promisify(mkdirp)
};
