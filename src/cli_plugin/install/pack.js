/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { analyzeArchive, extractArchive } from './zip';

const CAMEL_CASE_REG_EXP = /^[a-z]{1}([a-zA-Z0-9]{1,})$/;
export function isCamelCase(candidate) {
  return CAMEL_CASE_REG_EXP.test(candidate);
}

/**
 * Checks the plugin name. Will throw an exception if it does not meet
 *  npm package naming conventions
 *
 * @param {object} plugin - a package object from listPackages()
 */
function assertValidPackageName(plugin) {
  if (!isCamelCase(plugin.id)) {
    throw new Error(
      `Invalid plugin name [${plugin.id}] in kibana.json, expected it to be valid camelCase`
    );
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
 */
export async function extract(settings, logger) {
  try {
    const plugin = settings.plugins[0];

    logger.log('Extracting plugin archive');
    await extractArchive(settings.tempArchiveFile, settings.workingPath, plugin.stripPrefix);
    logger.log('Extraction complete');
  } catch (err) {
    logger.error(err.stack);
    throw new Error('Error extracting plugin archive');
  }
}
