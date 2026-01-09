/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const yaml = require('js-yaml');

// Constants
const PROJECT_ID = '@kbn/ui-shared-deps-src';
const BUILD_TASK_NAME = 'build-webpack';
const SOURCE_GROUP = 'group(@src)';
const WEBPACK_CONFIG = 'webpack.config.js';
const NO_DEPEND_ON_TESTS = [
  '!**/*.test.{js,ts,tsx}',
  '!**/__tests__/**/*.{js,ts,tsx}',
  '!**/*.test.{js,ts,tsx}',
];

/**
 * Moon will only rebuild this module if one of the inputs changes.
 * This function updates the build inputs for the webpack task in moon.extend.yml,
 * based on the dependencies used in the entry.js file.
 * @param {Object} options - Configuration options
 * @param {string} options.gitRoot - The git repository root path
 * @param {string} options.extendFilePath - Path to the moon.extend.yml file
 * @param {string} options.entryFilePath - Path to the entry.js file
 * @param {string} options.rootPackageJsonPath - Path to the root package.json file
 * @param {string} options.buildTaskName - Name of the build task to update
 */
function updateBuildInputs({
  gitRoot = cp.execSync('git rev-parse --show-toplevel').toString().trim(),
  extendFilePath = path.join(__dirname, 'moon.extend.yml'),
  entryFilePath = path.join(__dirname, 'src', 'entry.js'),
  rootPackageJsonPath = null,
  buildTaskName = BUILD_TASK_NAME,
} = {}) {
  // Set default rootPackageJsonPath if not provided
  const rootPackageJson = rootPackageJsonPath || path.join(gitRoot, 'package.json');
  console.log(`Updating inputs in ${extendFilePath}, based on ${entryFilePath}`);

  // Read and parse configuration files
  const extendFile = fs.readFileSync(extendFilePath, 'utf8');
  const extendYaml = yaml.load(extendFile);
  const rootPkg = JSON.parse(fs.readFileSync(rootPackageJson, 'utf8'));
  const entryFile = fs.readFileSync(entryFilePath, 'utf8');

  // Create dependency lookup
  const dependencyLookup = {
    ...rootPkg.dependencies,
    ...rootPkg.devDependencies,
  };

  // Extract kbn dependencies from the entry file
  const kbnDependencies =
    entryFile
      .match(/require\('@kbn\/([a-zA-Z0-9-_]+)'/g)
      ?.map((dep) => {
        return dep.replace("require('", '').replace(/'\)?/, '');
      })
      .sort() || [];

  // Generate dependency source patterns
  const kbnDependencySources = kbnDependencies.map((dep) => {
    const pathToDep = dependencyLookup[dep];
    if (!pathToDep) {
      throw new Error(`Could not find dependency "${dep}" in root package.json`);
    }
    const relativePath = pathToDep.startsWith('link:') ? pathToDep.replace('link:', '') : pathToDep;
    return `/${relativePath}/**/*.{js,ts,tsx}`;
  });

  // Compile full inputs list
  const fullInputsList = [
    SOURCE_GROUP,
    WEBPACK_CONFIG,
    ...kbnDependencySources,
    ...NO_DEPEND_ON_TESTS,
  ];

  if (extendYaml.tasks[buildTaskName].inputs.join() !== fullInputsList.join()) {
    // Update the configuration
    extendYaml.tasks[buildTaskName].inputs = fullInputsList;

    // Write updated configuration back to file
    const newExtendFile = yaml.dump(extendYaml, { lineWidth: -1 });
    console.log(`Writing updated inputs to ${extendFilePath}`);
    fs.writeFileSync(extendFilePath, newExtendFile, 'utf8');
    // Then regenerate the moon.yml file
    console.log(`Regenerating moon.yml...`);
    cp.execSync(`moon run ${PROJECT_ID}:regenerate-moon-config`, { stdio: 'inherit' });

    // Log the results
    console.log(`Updated ${buildTaskName} inputs in ${extendFilePath}:`);
    console.log(JSON.stringify(fullInputsList, null, 2));
  } else {
    console.log(`No changes to ${buildTaskName} inputs in ${extendFilePath}`);
  }

  return fullInputsList;
}

// Export the function for use as a module
module.exports = { updateBuildInputs };

// Run the function if this file is executed directly
if (require.main === module) {
  updateBuildInputs();
}
