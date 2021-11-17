/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const os = require('os');

/**
 * Mapping from Node platform type to Bazelisk type
 */
const PLATFORM_MAPPING = {
  darwin: 'darwin',
  linux: 'linux',
  win32: 'windows',
};

/**
 * Mapping from Node architecture type to Bazelisk arch
 */
const ARCH_MAPPING = {
  arm64: 'arm64',
  x64: 'amd64',
};

module.exports.getFilename = function getFilename(platform = os.platform(), arch = os.arch()) {
  const platformName = PLATFORM_MAPPING[platform];
  const archName = ARCH_MAPPING[arch];

  return `bazelisk-${platformName}-${archName}${platformName === 'windows' ? '.exe' : ''}`;
};
