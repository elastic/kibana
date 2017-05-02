const buildTask = require('../tasks/build');
const startTask = require('../tasks/start');
const testAllTask = require('../tasks/test/all');
const testBrowserTask = require('../tasks/test/browser');
const testServerTask = require('../tasks/test/server');

module.exports = {
  build: buildTask,
  start: startTask,
  testAll: testAllTask,
  testBrowser: testBrowserTask,
  testServer: testServerTask,
};