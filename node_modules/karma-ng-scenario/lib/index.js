var createPattern = function(path) {
  return {pattern: path, included: true, served: true, watched: false};
};

var initAngularScenario = function(files) {
  files.unshift(createPattern(__dirname + '/adapter.js'));
  files.unshift(createPattern(__dirname + '/angular-scenario.js'));
};

initAngularScenario.$inject = ['config.files'];

module.exports = {
  'framework:ng-scenario': ['factory', initAngularScenario]
};
