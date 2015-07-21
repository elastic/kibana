var COVERAGE = window.COVERAGE = !!(/coverage/i.test(window.location.search));
var DISABLE_RESIZE_CHECKER = window.DISABLE_RESIZE_CHECKER = true;
var SEED = parseFloat((window.location.search.match(/[&?]SEED=([^&]+)(?:&|$)/) || [])[1]);

if (isNaN(SEED)) SEED = Date.now();
console.log('Random-ness seed: ' + SEED);

var Nonsense = require('nonsense');
Math.nonsense = new Nonsense(SEED);
Math.random = function () {
  return Math.nonsense.frac();
};

var mocha = require('mocha');
mocha.setup({
  ui: 'bdd',
  timeout: 5000,
  reporter: 'html'
});

var angular = require('angular-mocks');

function setupCoverage(done) {
  document.title = document.title.replace('Tests', 'Coverage');
  mocha.reporter(require('testUtils/istanbul_reporter/reporter'));
}

exports.bootstrap = function () {
  var $ = require('jquery');
  var _ = require('lodash');
  var sinon = require('sinon');

  var _desc = window.describe;
  window.describe = _.wrap(_desc, unwindDescribeArrays);
  window.describe.only = _.wrap(_desc.only, unwindDescribeArrays);

  $('#mocha').html('');

  if (COVERAGE) {
    setupCoverage();
  }

  require('ui/chrome').setupAngular();

  var xhr = sinon.useFakeXMLHttpRequest();
  window.mochaRunner = mocha.run().on('end', function () {
    window.mochaResults = this.stats;
    window.mochaResults.details = getFailedTests(this);
    xhr.restore();
  });


  function getFailedTests(runner) {
    var fails = [];
    var suiteStack = [];
    (function recurse(suite) {
      suiteStack.push(suite);
      (suite.tests || [])
      .filter(function (test) {
          return test.state && test.state !== 'passed' && test.state !== 'pending';
        })
        .forEach(function (test) {
          fails.push({
            title: suiteStack.concat(test).reduce(function (title, suite) {
              if (suite.title) {
                return (title ? title + ' ' : '') + suite.title;
              } else {
                return title;
              }
            }, ''),
            err: test.err ? (test.err.stack || test.err.message) : 'unknown error'
          });
        });
      (suite.suites || []).forEach(recurse);
      suiteStack.pop();
    }(runner.suite));
    return fails;
  }

  function unwindDescribeArrays(fn, name, body) {
    if (!body && _.isArray(name)) {
      body = name[1];
      name = name[0];
    }
    return fn.call(this, name, body);
  }
};
