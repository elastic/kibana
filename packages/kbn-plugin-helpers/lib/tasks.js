var buildTask = require('../tasks/build');
var startTask = require('../tasks/start');
var testAllTask = require('../tasks/test/all');
var testBrowserTask = require('../tasks/test/browser');
var testServerTask = require('../tasks/test/server');

module.exports = {
  build: buildTask,
  start: startTask,
  testAll: testAllTask,
  testBrowser: testBrowserTask,
  testServer: testServerTask,
};