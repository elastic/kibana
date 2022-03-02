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
      'skip-archives',
      'skip-initialize',
      'skip-generic-folders',
      'skip-platform-folders',
      'skip-os-packages',
      'rpm',
      'deb',
      'docker-images',
      'docker-push',
      'skip-docker-contexts',
      'skip-docker-ubi',
      'skip-docker-ubuntu',
      'skip-docker-cloud',
      'release',
      'skip-node-download',
      'skip-cloud-dependencies-download',
      'verbose',
      'debug',
      'all-platforms',
      'example-plugins',
      'verbose',
      'quiet',
      'silent',
      'debug',
      'help',
    ],
    string: ['epr-registry'],
    alias: {
      v: 'verbose',
      d: 'debug',
    },
    default: {
      debug: true,
      'example-plugins': false,
      rpm: null,
      deb: null,
      'docker-images': null,
      'docker-push': false,
      'docker-tag-qualifier': null,
      'version-qualifier': '',
      'epr-registry': 'snapshot',
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

  const eprRegistry = flags['epr-registry'];
  if (eprRegistry !== 'snapshot' && eprRegistry !== 'production') {
    log.error(
      `Invalid value for --epr-registry, must be 'production' or 'snapshot', got ${eprRegistry}`
    );
    return {
      log,
      showHelp: true,
      unknownFlags: [],
    };
  }

  const buildOptions: BuildOptions = {
    isRelease: Boolean(flags.release),
    versionQualifier: flags['version-qualifier'],
    dockerPush: Boolean(flags['docker-push']),
    dockerTagQualifier: flags['docker-tag-qualifier'],
    initialize: !Boolean(flags['skip-initialize']),
    downloadFreshNode: !Boolean(flags['skip-node-download']),
    downloadCloudDependencies: !Boolean(flags['skip-cloud-dependencies-download']),
    createGenericFolders: !Boolean(flags['skip-generic-folders']),
    createPlatformFolders: !Boolean(flags['skip-platform-folders']),
    createArchives: !Boolean(flags['skip-archives']),
    createExamplePlugins: Boolean(flags['example-plugins']),
    createRpmPackage: isOsPackageDesired('rpm'),
    createDebPackage: isOsPackageDesired('deb'),
    createDockerUbuntu:
      isOsPackageDesired('docker-images') && !Boolean(flags['skip-docker-ubuntu']),
    createDockerCloud: isOsPackageDesired('docker-images') && !Boolean(flags['skip-docker-cloud']),
    createDockerUBI: isOsPackageDesired('docker-images') && !Boolean(flags['skip-docker-ubi']),
    createDockerContexts: !Boolean(flags['skip-docker-contexts']),
    targetAllPlatforms: Boolean(flags['all-platforms']),
    eprRegistry: flags['epr-registry'],
  };

  return {
    log,
    showHelp: false,
    unknownFlags: [],
    buildOptions,
  };
}
