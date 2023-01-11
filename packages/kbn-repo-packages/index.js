/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @typedef {import('./modern/types').PluginPackage} PluginPackage */
/** @typedef {import('./modern/types').PluginPackage['manifest']} PluginPackageManifest */
/** @typedef {import('./modern/types').PluginSelector} PluginSelector */
/** @typedef {import('./modern/types').KibanaPackageManifest} KibanaPackageManifest */
/** @typedef {import('./modern/types').KibanaPackageType} KibanaPackageType */
/** @typedef {import('./modern/types').ParsedPackageJson} ParsedPackageJson */
/** @typedef {import('./modern/types').KbnImportReq} KbnImportReq */
/** @typedef {import('./modern/types').PluginTypeInfo} PluginTypeInfo */
/** @typedef {Map<string, string>} PackageMap */

const { getPackages, findPackageInfoForPath } = require('./modern/get_packages');
const {
  parsePackageManifest,
  readPackageManifest,
  validatePackageManifest,
} = require('./modern/parse_package_manifest');
const { Package } = require('./modern/package');
const { parseKbnImportReq } = require('./modern/parse_kbn_import_req');
const Jsonc = require('./utils/jsonc');
const {
  getDistributablePacakgesFilter,
  getPluginPackagesFilter,
  getPluginSearchPaths,
} = require('./modern/plugins');
const { readHashOfPackageMap, readPackageMap } = require('./modern/pkg_map');

module.exports = {
  Package,
  readHashOfPackageMap,
  readPackageMap,
  getPackages,
  findPackageInfoForPath,
  parsePackageManifest,
  readPackageManifest,
  validatePackageManifest,
  Jsonc,
  getDistributablePacakgesFilter,
  getPluginPackagesFilter,
  getPluginSearchPaths,
  parseKbnImportReq,
};
