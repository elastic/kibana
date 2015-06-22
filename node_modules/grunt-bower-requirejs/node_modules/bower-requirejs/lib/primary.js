'use strict';
var path = require('path');
var slash = require('slash');
var _ = require('lodash');
var chalk = require('chalk');
var warn = chalk.black.bgYellow;
var file = require('file-utils');
var path = require('path');

/**
 * Find primary js file in directory if no bower.json
 * exists.
 */
module.exports = function (name, dep, opts) {

  opts = opts || {};

  // Define extra search dirs, relatie to canonicalDir.
  // Default is to add 'dist' folder (e.g. for jquery).
  // canonialDir is included as first searchDir.
  var extraSearchDirs = opts.extraSearchDirs || ['dist'];
  var searchDirs = [''].concat(extraSearchDirs);

  /**
   * Fixup slashes in file paths for windows
   */
  function normalizePath(str) {
    return process.platform === 'win32' ? slash(str) : str;
  }

  /**
   * If we find any Gruntfiles, remove them and log a warning.
   */
  function excludeGrunt() {
    if (_.contains(main, 'grunt.js') || _.contains(main, 'Gruntfile.js')) {
      console.log(warn('WARN'), 'Ignoring Gruntfile in ' + name);
      console.log('You should inform the author to ignore this file in their bower.json\n');
      main = _.without(main, 'grunt.js', 'Gruntfile.js');
    }
    return main;
  }

  /**
   * Test for candidate files in search dirs.
   */
  function findCandidateFile(candidateFile) {
    var searches = _.map(searchDirs, function (searchDir) {
      return function () {
        var candidatePath = path.join(searchDir, candidateFile);
        if (_.contains(main, candidatePath)) {
          main = [candidatePath];
        }
      };
    });
    until(primaryFound, searches, function () {});
  }

  /**
   * Look for a primary .js file based on the project name
   * ex: backbone.js inside backbone dir
   */
  function findByDirname() {
    var candidateFile = path.basename(dep.canonicalDir) + '.js';
    findCandidateFile(candidateFile);
  }

  /**
   * Look for a primary .js file based on the project name minus 'js'
   * ex: require.js inside requirejs dir
   */
  function findByDirnameSuffix() {
    var candidateFile = path.basename(dep.canonicalDir).replace(/js$/, '') + '.js';
    findCandidateFile(candidateFile);
  }

  /**
   * Look for primary .js file in package.json
   */
  function findByPackage() {
    var pkgPath = path.join(dep.canonicalDir, 'package.json');
    if (file.exists(pkgPath)) {
      var pkg = file.readJSON(pkgPath);

      if (pkg.main) {
        main = [pkg.main];
      }
    }
  }

  /**
   * Execute callbacks in order until test passes or
   * we run out of callbacks
   */
  function until(test, callbacks, done) {
    for (var i = 0; i < callbacks.length; i++) {
      if (test()) {
        break;
      } else {
        callbacks[i].call();
      }
    }

    done();
  }

  /**
   * Test if only one js file remains
   */
  function primaryFound() {
    return main.length === 1;
  }

  /**
   * If a top level js file is found set that to the return
   * value. Otherwise return false to indicate a failure
   */
  function end() {
    if (primaryFound()) {
      dep = main[0];
    } else {
      dep = false;
    }
  }

  // Put all js files in search dirs into an array
  var main = [];
  _.each(searchDirs, function (searchDir) {
    var searchPath = path.join(dep.canonicalDir, searchDir);
    var candidateFiles = file.expand({ cwd: normalizePath(searchPath)}, '*.js', '!*.min.js');
    _.each(candidateFiles, function (candidateFile) {
      main.push(normalizePath(path.join(searchDir, candidateFile)));
    });
  });

  // Remove any Gruntfiles
  excludeGrunt();

  // Call find functions until test passes or
  // we run out of functions
  until(primaryFound, [
    findByDirname,
    findByDirnameSuffix,
    findByPackage
  ], end);

  return dep;
};
