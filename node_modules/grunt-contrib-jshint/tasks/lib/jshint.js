/*
 * grunt-contrib-jshint
 * http://gruntjs.com/
 *
 * Copyright (c) 2013 "Cowboy" Ben Alman, contributors
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path');
var jshint = require('jshint').JSHINT;
var jshintcli = require('jshint/src/cli');

exports.init = function(grunt) {
  var exports = {
    usingGruntReporter: false
  };

  // No idea why JSHint treats tabs as options.indent # characters wide, but it
  // does. See issue: https://github.com/jshint/jshint/issues/430
  var getTabStr = function(options) {
    options = options ? grunt.util._.clone(options) : {};
    options.maxerr = 50;
    // Do something that's going to error.
    jshint('\tx', options);
    // If an error occurred, figure out what character JSHint reported and
    // subtract one.
    var character = jshint.errors && jshint.errors[0] && jshint.errors[0].character - 1;
    // If character is actually a number, use it. Otherwise use 1.
    var tabsize = isNaN(character) ? 1 : character;
    // If tabsize > 1, return something that should be safe to use as a
    // placeholder. \uFFFF repeated 2+ times.
    return tabsize > 1 && grunt.util.repeat(tabsize, '\uFFFF');
  };

  var tabregex = /\t/g;

  // Select a reporter (if not using the default Grunt reporter)
  // Copied from jshint/src/cli/cli.js until that part is exposed
  exports.selectReporter = function(options) {
    switch (true) {
    // JSLint reporter
    case options.reporter === 'jslint':
    case options['jslint-reporter']:
      options.reporter = 'jshint/src/reporters/jslint_xml.js';
      break;

    // CheckStyle (XML) reporter
    case options.reporter === 'checkstyle':
    case options['checkstyle-reporter']:
      options.reporter = 'jshint/src/reporters/checkstyle.js';
      break;

    // Reporter that displays additional JSHint data
    case options['show-non-errors']:
      options.reporter = 'jshint/src/reporters/non_error.js';
      break;

    // Custom reporter
    case options.reporter !== undefined:
      options.reporter = path.resolve(process.cwd(), options.reporter);
    }

    var reporter;
    if (options.reporter) {
      try {
        reporter = require(options.reporter).reporter;
        exports.usingGruntReporter = false;
      } catch (err) {
        grunt.fatal(err);
      }
    }

    // Use the default Grunt reporter if none are found
    if (!reporter) {
      reporter = exports.reporter;
      exports.usingGruntReporter = true;
    }

    return reporter;
  };

  // Default Grunt JSHint reporter
  exports.reporter = function(results, data) {
    // Dont report empty data as its an ignored file
    if (data.length < 1) {
      grunt.log.error('0 files linted. Please check your ignored files.');
      return;
    }

    if (results.length === 0) {
      // Success!
      grunt.verbose.ok();
      return;
    }

    var options = data[0].options;

    // Tab size as reported by JSHint.
    var tabstr = getTabStr(options);
    var placeholderregex = new RegExp(tabstr, 'g');

    var lastfile = null;
    // Iterate over all errors.
    results.forEach(function(result) {
      // Display the defending file
      var msg = 'Linting' + (result.file ? ' ' + result.file : '') + ' ...';
      grunt.verbose.write(msg);

      // Only print file name once per error
      if (result.file !== lastfile) {
        grunt.verbose.or.write(msg);
        grunt.log.error();
      }
      lastfile = result.file;

      var e = result.error;
      // Sometimes there's no error object.
      if (!e) { return; }
      var pos;
      var code = '';
      var evidence = e.evidence;
      var character = e.character;
      if (evidence) {
        // Manually increment errorcount since we're not using grunt.log.error().
        grunt.fail.errorcount++;
        // Descriptive code error.
        pos = '['.red + ('L' + e.line).yellow + ':'.red + ('C' + character).yellow + ']'.red;
        if (e.code) {
          code = e.code.yellow + ':'.red + ' ';
        }
        grunt.log.writeln(pos + ' ' + code + e.reason.yellow);
        // If necessary, eplace each tab char with something that can be
        // swapped out later.
        if (tabstr) {
          evidence = evidence.replace(tabregex, tabstr);
        }
        if (character === 0) {
          // Beginning of line.
          evidence = '?'.inverse.red + evidence;
        } else if (character > evidence.length) {
          // End of line.
          evidence = evidence + ' '.inverse.red;
        } else {
          // Middle of line.
          evidence = evidence.slice(0, character - 1) + evidence[character - 1].inverse.red +
            evidence.slice(character);
        }
        // Replace tab placeholder (or tabs) but with a 2-space soft tab.
        evidence = evidence.replace(tabstr ? placeholderregex : tabregex, '  ');
        grunt.log.writeln(evidence);
      } else {
        // Generic "Whoops, too many errors" error.
        grunt.log.error(e.reason);
      }
    });
    grunt.log.writeln();
  };

  // Run JSHint on the given files with the given options
  exports.lint = function(files, options, done) {
    var cliOptions = {
      verbose: grunt.option('verbose'),
      extensions: '',
    };

    // A list of non-dot-js extensions to check
    if (options.extensions) {
      cliOptions.extensions = options.extensions;
      delete options.extensions;
    }

    // A list ignored files
    if (options.ignores) {
      if (typeof options.ignores === 'string') {
        options.ignores = [options.ignores];
      }
      cliOptions.ignores = options.ignores;
      delete options.ignores;
    }

    // Select a reporter to use
    var reporter = exports.selectReporter(options);

    // Remove bad options that may have came in from the cli
    ['reporter', 'jslint-reporter', 'checkstyle-reporter', 'show-non-errors'].forEach(function(opt) {
      if (options.hasOwnProperty(opt)) {
        delete options[opt];
      }
    });

    if (options.jshintrc === true) {
      // let jshint find the options itself
      delete cliOptions.config;
    } else if (options.jshintrc) {
      // Read JSHint options from a specified jshintrc file.
      cliOptions.config = jshintcli.loadConfig(options.jshintrc);
    } else {
      // Enable/disable debugging if option explicitly set.
      if (grunt.option('debug') !== undefined) {
        options.devel = options.debug = grunt.option('debug');
        // Tweak a few things.
        if (grunt.option('debug')) {
          options.maxerr = Infinity;
        }
      }
      // pass all of the remaining options directly to jshint
      cliOptions.config = options;
    }

    // Run JSHint on all file and collect results/data
    var allResults = [];
    var allData = [];
    var cliopts = grunt.util._.clone(cliOptions);
    cliopts.args = files;
    cliopts.reporter = function(results, data) {
      reporter(results, data);
      allResults = allResults.concat(results);
      allData = allData.concat(data);
    };
    jshintcli.run(cliopts);
    done(allResults, allData);
  };

  return exports;
};
