var inquirer = require('inquirer');

var createBuild = require('./create_build');

module.exports = function (plugin, run, options) {
  options = options || {};
  var buildVersion = plugin.version;
  var kibanaVersion = (plugin.pkg.kibana && plugin.pkg.kibana.version) || plugin.pkg.version;
  var buildFiles = plugin.buildSourcePatterns;

  // allow source files to be overridden
  if (options.files && options.files.length) {
    buildFiles = options.files;
  }

  // allow options to override plugin info
  if (options.buildVersion) buildVersion = options.buildVersion;
  if (options.kibanaVersion) kibanaVersion = options.kibanaVersion;

  if (kibanaVersion === 'kibana') {
    return askForKibanaVersion().then(function (customKibanaVersion) {
      return createBuild(plugin, buildVersion, customKibanaVersion, buildFiles);
    });
  } else {
    return createBuild(plugin, buildVersion, kibanaVersion, buildFiles);
  }
};

function askForKibanaVersion(cb) {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'kibanaVersion',
      message: 'What version of Kibana are you building for?'
    }
  ]).then(function (answers) {
    return answers.kibanaVersion;
  });
}