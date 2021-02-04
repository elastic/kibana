/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import getopts from 'getopts';
import { ToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';

import { BuildOptions } from './build_distributables';

export function readCliArgs(argv: string[]) {
  const unknownFlags: string[] = [];
  const flags = getopts(argv, {
    boolean: [
      'oss',
      'no-oss',
      'skip-archives',
      'skip-os-packages',
      'rpm',
      'deb',
      'docker-images',
      'skip-docker-contexts',
      'skip-docker-ubi',
      'skip-docker-centos',
      'release',
      'skip-node-download',
      'verbose',
      'debug',
      'all-platforms',
      'verbose',
      'quiet',
      'silent',
      'debug',
      'help',
    ],
    alias: {
      v: 'verbose',
      d: 'debug',
    },
    default: {
      debug: true,
      rpm: null,
      deb: null,
      'docker-images': null,
      oss: null,
      'version-qualifier': '',
    },
    unknown: (flag) => {
      unknownFlags.push(flag);
      return false;
    },
  });

  const log = new ToolingLog({
    level: pickLevelFromFlags(flags, {
      default: flags.debug === false ? 'info' : 'debug',
    }),
    writeTo: process.stdout,
  });

  if (unknownFlags.length || flags.help) {
    return {
      log,
      showHelp: true,
      unknownFlags,
    };
  }

  // In order to build a docker image we always need
  // to generate all the platforms
  if (flags['docker-images']) {
    flags['all-platforms'] = true;
  }

  function isOsPackageDesired(name: string) {
    if (flags['skip-os-packages'] || !flags['all-platforms']) {
      return false;
    }

    // build all if no flags specified
    if (flags.rpm === null && flags.deb === null && flags['docker-images'] === null) {
      return true;
    }

    return Boolean(flags[name]);
  }

  const buildOptions: BuildOptions = {
    isRelease: Boolean(flags.release),
    versionQualifier: flags['version-qualifier'],
    buildOssDist: flags.oss !== false,
    buildDefaultDist: !flags.oss,
    downloadFreshNode: !Boolean(flags['skip-node-download']),
    createArchives: !Boolean(flags['skip-archives']),
    createRpmPackage: isOsPackageDesired('rpm'),
    createDebPackage: isOsPackageDesired('deb'),
    createDockerCentOS:
      isOsPackageDesired('docker-images') && !Boolean(flags['skip-docker-centos']),
    createDockerUBI: isOsPackageDesired('docker-images') && !Boolean(flags['skip-docker-ubi']),
    createDockerContexts: !Boolean(flags['skip-docker-contexts']),
    targetAllPlatforms: Boolean(flags['all-platforms']),
  };

  return {
    log,
    showHelp: false,
    unknownFlags: [],
    buildOptions,
  };
}
