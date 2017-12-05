const promisify = require('es6-promisify');
const process = require('child_process');
const fs = require('fs');
const mkdirp = require('mkdirp');
const findUp = require('find-up');

module.exports = {
  exec: promisify(process.exec),
  writeFile: promisify(fs.writeFile),
  readFile: promisify(fs.readFile),
  stat: promisify(fs.stat),
  statSync: fs.statSync,
  mkdirp: promisify(mkdirp),
  findUp
};
