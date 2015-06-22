'use strict';

var path = require('path');
var grunt = require('grunt');
var jshint = require('../tasks/lib/jshint').init(grunt);

var fixtures = path.join(__dirname, 'fixtures');

// Helper for testing stdout
var hooker = grunt.util.hooker;
var stdoutEqual = function(callback, done) {
  var actual = '';
  // Hook process.stdout.write
  hooker.hook(process.stdout, 'write', {
    // This gets executed before the original process.stdout.write.
    pre: function(result) {
      // Concatenate uncolored result onto actual.
      actual += grunt.log.uncolor(result);
      // Prevent the original process.stdout.write from executing.
      return hooker.preempt();
    }
  });
  // Execute the logging code to be tested.
  callback();
  // Restore process.stdout.write to its original value.
  hooker.unhook(process.stdout, 'write');
  // Actually test the actually-logged stdout string to the expected value.
  done(actual);
};

exports.jshint = {
  basic: function(test) {
    test.expect(1);
    var files = [path.join(fixtures, 'missingsemicolon.js')];
    var options = {};
    jshint.lint(files, options, function(results, data) {
      test.equal(results[0].error.reason, 'Missing semicolon.', 'Should reporter a missing semicolon.');
      test.done();
    });
  },
  jshintrc: function(test) {
    test.expect(1);
    var files = [path.join(fixtures, 'nodemodule.js')];
    var options = {
      jshintrc: path.join(__dirname, '..', '.jshintrc')
    };
    jshint.lint(files, options, function(results, data) {
      test.ok(results.length === 0, 'Should not have reported any errors with supplied .jshintrc');
      test.done();
    });
  },
  passTheJshintrcBuck: function(test) {
    test.expect(1);
    var files = [path.join(fixtures, 'nodemodule.js')];
    var options = {
      jshintrc: true
    };
    jshint.lint(files, options, function(results, data) {
      test.ok(results.length === 0, 'Should not have reported any errors, .jshintrc must not have been found');
      test.done();
    });
  },
  defaultReporter: function(test) {
    test.expect(2);
    grunt.log.muted = false;
    var files = [path.join(fixtures, 'nodemodule.js')];
    var options = {};
    stdoutEqual(function() {
      jshint.lint(files, options, function(results, data) {});
    }, function(result) {
      test.ok(jshint.usingGruntReporter, 'Should be using the default grunt reporter.');
      test.ok(result.indexOf('[L3:C1] W117: \'module\' is not defined.') !== -1, 'Should have reported errors with the default grunt reporter.');
      test.done();
    });
  },
  defaultReporterErrors: function(test) {
    test.expect(3);
    grunt.log.muted = false;
    var files = [path.join(fixtures, 'nodemodule.js'), path.join(fixtures, 'missingsemicolon.js')];
    var options = {};
    stdoutEqual(function() {
      jshint.lint(files, options, function(results, data) {});
    }, function(result) {
      test.ok(jshint.usingGruntReporter, 'Should be using the default grunt reporter.');
      test.ok(result.match(/nodemodule\.js\s\.\.\.ERROR/g).length === 1, 'Should have reported nodemodule.js only once.');
      test.ok(result.match(/missingsemicolon\.js\s\.\.\.ERROR/g).length === 1, 'Should have reported missingsemicolon.js only once.');
      test.done();
    });
  },
  alternateReporter: function(test) {
    test.expect(2);
    var files = [path.join(fixtures, 'nodemodule.js')];
    var options = {
      reporter: 'jslint'
    };
    stdoutEqual(function() {
      jshint.lint(files, options, function(results, data) {});
    }, function(result) {
      test.ok((jshint.usingGruntReporter === false), 'Should NOT be using the default grunt reporter.');
      test.ok(result.indexOf('<jslint>') !== -1, 'Should have reported errors with the jslint reporter.');
      test.done();
    });
  },
  reporterOutput: function(test) {
    test.expect(1);
    var result = grunt.file.read(path.join('tmp', 'report.xml'));
    test.ok(result.indexOf('<file name="test/fixtures/missingsemicolon.js">') !== -1, 'Should have reported errors with the checkstyle reporter.');
    test.done();
  },
  dontBlowUp: function(test) {
    test.expect(1);
    var files = [path.join(fixtures, 'lint.txt')];
    jshint.lint(files, {}, function(results, data) {
      test.equal(results[0].error.code, 'W100', 'It should not blow up if an error occurs on character 0.');
      test.done();
    });
  },
  jshintignore: function(test) {
    test.expect(1);
    var files = [path.join(fixtures, 'dontlint.txt')];
    jshint.lint(files, {}, function(results, data) {
      test.equal(data.length, 0, 'Should not have linted a file listed in the .jshintignore.');
      test.done();
    });
  },
  ignoresOption: function(test) {
    test.expect(1);
    var files = [path.join(fixtures, 'lint.txt')];
    var options = {
      ignores: files
    };
    jshint.lint(files, options, function(results, data) {
      test.equal(data.length, 0, 'Should not have linted a file listed in the ignores option.');
      test.done();
    });
  },
  singleReportCall: function(test) {
    test.expect(2);

    // stub jshint.reporter
    var reporterCallCount = 0;
    var _report = jshint.reporter;
    jshint.reporter = function() { reporterCallCount++; };

    var files = [path.join(fixtures, 'dontlint.txt'), path.join(fixtures, 'lint.txt')];
    jshint.lint(files, {}, function(results, data) {
      test.equal(data.length, 1, 'Should not have linted a file listed in the .jshintignore.');
      test.equal(reporterCallCount, 1, 'Should have called the reporter once.');
      test.done();
    });
  }
};
