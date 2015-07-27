/* global mocha */
var Nonsense = require('Nonsense');
var sinon = require('sinon');
var $ = require('jquery');
var _ = require('lodash');
var parse = require('url').parse;
require('es5-shim');
var StackTraceMapper = require('ui/StackTraceMapper');

var chrome = require('ui/chrome');
var getFailedSpecsFromMochaRunner = require('./getFailedSpecsFromMochaRunner');
require('./testHarness.less');

var url = parse(window.location.href, true);
var query = url.query;
var seed = _.add(query.seed, 0) || Date.now();
var coverage = _.has(query, 'coverage');


/*** Setup seeded random ***/
Math.random = _.bindKey(new Nonsense(seed), 'frac');
Math.random.nonsense = new Nonsense(seed);
console.log('Random-ness seed: ' + seed);


/*** Setup mocha ***/
mocha.setup({
  ui: 'bdd',
  timeout: 5000,
  reporter: 'html'
});


/*** Switch to coverage mode if needed ***/
if (coverage) {
  document.title = document.title.replace('Tests', 'Coverage');
  mocha.reporter(require('testUtils/istanbul_reporter/reporter'));
}

/*** Setup auto releasing stubs and spys ***/
require('auto-release-sinon').setupAutoRelease(sinon, window.afterEach);

/*** Make sure that angular-mocks gets setup in the global suite **/
require('ngMock');

/*** manually map error stack traces using the sourcemap ***/
before(function () {
  // before the tests start, load the sourcemap and hook into error generation for the mocha reporter
  this.timeout(30000);

  var mapper;
  var Runner = window.Mocha.Runner;

  Runner.prototype.emit = _.wrap(Runner.prototype.emit, function (emit, event, test, err) {
    if (err && mapper) err = mapper.mapError(err);
    return emit.call(this, event, test, err);
  });

  return StackTraceMapper.getInstance().then(function (instance) {
    mapper = instance;
  });
});

before(function () {
  sinon.useFakeXMLHttpRequest();
});


/*** Kick off mocha, called at the end of test entry files ***/
exports.bootstrap = function () {
  $('#mocha').html('');

  chrome.setupAngular();
  // Only tests run in real browser, injected script run if options.run == true
  if (navigator.userAgent.indexOf('PhantomJS') < 0) {
    mocha.run();
  }
};
