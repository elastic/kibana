const { promisify } = require('util');
const { exec } = require('child_process');
const fs = require('fs');
const mkdirp = require('mkdirp');
const findUp = require('find-up');

module.exports = {
  execVanilla: exec,
  exec: promisify(exec),
  writeFile: promisify(fs.writeFile),
  readFile: promisify(fs.readFile),
  stat: promisify(fs.stat),
  statSync: fs.statSync,
  mkdirp: promisify(mkdirp),
  findUp
};
