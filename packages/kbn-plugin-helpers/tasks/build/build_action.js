/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const join = require('path').join;
const resolve = require('path').resolve;
const inquirer = require('inquirer');

const createBuild = require('./create_build');
const createPackage = require('./create_package');

module.exports = function(plugin, run, options) {
  options = options || {};
  let buildVersion = plugin.version;
  let kibanaVersion = (plugin.pkg.kibana && plugin.pkg.kibana.version) || plugin.pkg.version;
  let buildFiles = plugin.buildSourcePatterns;
  let buildTarget = join(plugin.root, 'build');

  // allow source files to be overridden
  if (options.files && options.files.length) {
    buildFiles = options.files;
  }

  // allow options to override plugin info
  if (options.buildDestination) buildTarget = resolve(plugin.root, options.buildDestination);
  if (options.buildVersion) buildVersion = options.buildVersion;
  if (options.kibanaVersion) kibanaVersion = options.kibanaVersion;

  let buildStep;
  if (kibanaVersion === 'kibana') {
    buildStep = askForKibanaVersion().then(function(customKibanaVersion) {
      return createBuild(plugin, buildTarget, buildVersion, customKibanaVersion, buildFiles);
    });
  } else {
    buildStep = createBuild(plugin, buildTarget, buildVersion, kibanaVersion, buildFiles);
  }

  return buildStep.then(function() {
    if (options.skipArchive) return;
    return createPackage(plugin, buildTarget, buildVersion);
  });
};

function askForKibanaVersion() {
  return inquirer
    .prompt([
      {
        type: 'input',
        name: 'kibanaVersion',
        message: 'What version of Kibana are you building for?',
      },
    ])
    .then(function(answers) {
      return answers.kibanaVersion;
    });
}
