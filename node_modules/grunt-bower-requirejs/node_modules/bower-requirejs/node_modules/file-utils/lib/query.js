'use strict';
/**
 * File/Path comparison and queries
 */

var path = require('path');
var fs = require('fs');

// True if the file path exists.
exports.exists = function() {
  var filepath = path.join.apply(path, arguments);
  return fs.existsSync(filepath);
};

// True if the file is a symbolic link.
exports.isLink = function() {
  var filepath = path.join.apply(path, arguments);
  return this.exists(filepath) && fs.lstatSync(filepath).isSymbolicLink();
};

// True if the path is a directory.
exports.isDir = function() {
  var filepath = path.join.apply(path, arguments);
  return this.exists(filepath) && fs.statSync(filepath).isDirectory();
};

// True if the path is a file.
exports.isFile = function() {
  var filepath = path.join.apply(path, arguments);
  return this.exists(filepath) && fs.statSync(filepath).isFile();
};

exports.isExecutable = function(filepath) {
  var stats = fs.statSync(filepath);
  return !!(1 & parseFloat((stats.mode & parseInt(777, 8)).toString(8)[0]));
};

// Is a given file path absolute?
exports.isPathAbsolute = function() {
  var filepath = path.join.apply(path, arguments);
  return path.resolve(filepath) === filepath.replace(/[\/\\]+$/, '');
};

// Do all the specified paths refer to the same path?
exports.arePathsEquivalent = function(first) {
  first = path.resolve(first);
  for (var i = 1; i < arguments.length; i++) {
    if (first !== path.resolve(arguments[i])) { return false; }
  }
  return true;
};

// Are descendant path(s) contained within ancestor path? Note: does not test
// if paths actually exist.
exports.doesPathContain = function(ancestor) {
  ancestor = path.resolve(ancestor);
  var relative;
  for (var i = 1; i < arguments.length; i++) {
    relative = path.relative(path.resolve(arguments[i]), ancestor);
    if (relative === '' || /\w+/.test(relative)) { return false; }
  }
  return true;
};

// Test to see if a filepath is the CWD.
exports.isPathCwd = function() {
  var filepath = path.join.apply(path, arguments);
  try {
    return this.arePathsEquivalent(process.cwd(), fs.realpathSync(filepath));
  } catch(e) {
    return false;
  }
};

// Test to see if a filepath is contained within the CWD.
exports.isPathInCwd = function() {
  var filepath = path.join.apply(path, arguments);
  try {
    return this.doesPathContain(process.cwd(), fs.realpathSync(filepath));
  } catch(e) {
    return false;
  }
};
