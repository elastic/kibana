"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._calculateTopLevelDependency = _calculateTopLevelDependency;
exports.dependenciesParseStrategy = dependenciesParseStrategy;

var _can_require = require("./can_require");

var _visitors = require("./visitors");

var _path = require("path");

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
function _calculateTopLevelDependency(inputDep, outputDep = '') {
  // The path separator will be always the forward slash
  // as at this point we only have the found entries into
  // the provided source code entries where we just use it
  const pathSeparator = '/';
  const depSplitPaths = inputDep.split(pathSeparator);
  const firstPart = depSplitPaths.shift();
  const outputDepFirstArgAppend = outputDep ? pathSeparator : '';
  outputDep += `${outputDepFirstArgAppend}${firstPart}`; // In case our dependency isn't started by @
  // we are already done and we can return the
  // dependency value we already have

  if (firstPart.charAt(0) !== '@') {
    return outputDep;
  } // Otherwise we need to keep constructing the dependency
  // value because dependencies starting with @ points to
  // folders of dependencies. For example, in case we found
  // dependencies values with '@the-deps/a' and '@the-deps/a/b'
  // we don't want to map it to '@the-deps' but also to @'the-deps/a'
  // because inside '@the-deps' we can also have '@the-dep/b'


  return _calculateTopLevelDependency(depSplitPaths.join(pathSeparator), outputDep);
}

async function dependenciesParseStrategy(cwd, parseSingleFile, mainEntry, wasParsed, results) {
  // Retrieve native nodeJS modules
  const natives = process.binding('natives'); // Get dependencies from a single file and filter
  // out node native modules from the result

  const dependencies = (await parseSingleFile(mainEntry, _visitors.dependenciesVisitorsGenerator)).filter(dep => !natives[dep]); // Return the list of all the new entries found into
  // the current mainEntry that we could use to look for
  // new dependencies

  return dependencies.reduce((filteredEntries, entry) => {
    const absEntryPath = (0, _path.resolve)(cwd, (0, _path.dirname)(mainEntry), entry);
    const requiredPath = (0, _can_require.canRequire)(cwd, absEntryPath);
    const requiredRelativePath = (0, _can_require.canRequire)(cwd, entry);
    const isRelativeFile = !(0, _path.isAbsolute)(entry);
    const isNodeModuleDep = isRelativeFile && !requiredPath && requiredRelativePath;
    const isNewEntry = isRelativeFile && requiredPath; // If it is a node_module add it to the results and also
    // add the resolved path for the node_module main file
    // as an entry point to look for dependencies it was
    // not already parsed

    if (isNodeModuleDep) {
      // Save the result as the top level dependency
      results[_calculateTopLevelDependency(entry)] = true;

      if (!wasParsed[requiredRelativePath]) {
        filteredEntries.push(requiredRelativePath);
      }
    } // If a new, not yet parsed, relative entry were found
    // add it to the list of entries to be parsed


    if (isNewEntry && !wasParsed[requiredPath]) {
      if (!wasParsed[requiredPath]) {
        filteredEntries.push(requiredPath);
      }
    }

    return filteredEntries;
  }, []);
}