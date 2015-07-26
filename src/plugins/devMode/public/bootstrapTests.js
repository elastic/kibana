
var Nonsense = require('Nonsense');
var sinon = require('sinon');
var mocha = require('mocha');
var chrome = require('ui/chrome');
var $ = require('jquery');
var _ = require('lodash');
var parse = require('url').parse;

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
  timeout: 5000
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

/*** Kick off mocha, called at the end of test entry files ***/
exports.bootstrap = function () {
  $('#mocha').html('');

  chrome.setupAngular();

  var xhr = sinon.useFakeXMLHttpRequest();
  window.mochaRunner = mocha.run().on('end', function () {
    window.mochaResults = this.stats;
    window.mochaResults.details = getFailedSpecsFromMochaRunner(this);
    xhr.restore();
  });
};
