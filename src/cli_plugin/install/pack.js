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

import { analyzeArchive, extractArchive } from './zip';
import validate from 'validate-npm-package-name';

/**
 * Checks the plugin name. Will throw an exception if it does not meet
 *  npm package naming conventions
 *
 * @param {object} plugin - a package object from listPackages()
 */
function assertValidPackageName(plugin) {
  const validation = validate(plugin.name);
  if (!validation.validForNewPackages) {
    throw new Error(`Invalid plugin name [${plugin.name}] in package.json`);
  }
}

/**
 * Returns the detailed information about each kibana plugin in the pack.
 *  TODO: If there are platform specific folders, determine which one to use.
 *
 * @param {object} settings - a plugin installer settings object
 * @param {object} logger - a plugin installer logger object
 */
export async function getPackData(settings, logger) {
  let packages = [];
  logger.log('Retrieving metadata from plugin archive');
  try {
    packages = await analyzeArchive(settings.tempArchiveFile);
  } catch (err) {
    logger.error(err.stack);
    throw new Error('Error retrieving metadata from plugin archive');
  }

  if (packages.length === 0) {
    throw new Error('No kibana plugins found in archive');
  }

  packages.forEach(assertValidPackageName);
  settings.plugins = packages;
}

/**
 * Extracts files from a zip archive to a file path using a filter function
 *
 * @param {string} archive - file path to a zip archive
 * @param {string} targetDir - directory path to where the files should
 *  extracted
 */
export async function extract(settings, logger) {
  try {
    const plugin = settings.plugins[0];

    logger.log('Extracting plugin archive');
    await extractArchive(settings.tempArchiveFile, settings.workingPath, plugin.archivePath);
    logger.log('Extraction complete');
  } catch (err) {
    logger.error(err.stack);
    throw new Error('Error extracting plugin archive');
  }
}
