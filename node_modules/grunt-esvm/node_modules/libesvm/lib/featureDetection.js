var Bluebird = require('bluebird');
var join = require('path').join;
var exec = Bluebird.promisify(require('child_process').exec);
var memoize = require('lodash').memoize;

function getVersionFlag(stdout) {
  // versions 5.0+
  if(/-V\b/g.test(stdout)){
    return '-V';
  }

  // versions <2.0
  if(/-v\b/g.test(stdout)){
    return '-v';
  }

  // Some 2.0 version don't have --version in the help command so we can just
  // try to assume that it will work. All the 1.x have -v
  return '--version';
}

function getConfigVarFlag(stdout) {
  if (stdout.indexOf('-E <KeyValuePair>') > -1) {
    return '-Ees.';
  }

  return '-Des.';
}

exports.getFeatures = memoize(function featureDetect(path) {
  var cmd = join(path, 'bin', 'elasticsearch');

  return exec(cmd + ' --help')
  .then(function (results) {
    var stdout = results[0];
    var stderr = results[1];

    return {
      versionFlag: getVersionFlag(stdout, stderr),
      configVarFlag: getConfigVarFlag(stdout, stderr)
    };
  });
});
