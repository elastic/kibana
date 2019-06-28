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

import getopts from 'getopts';
import { ToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';

interface ParsedArgs {
  showHelp: boolean;
  unknownFlags: string[];
  log?: ToolingLog;
  buildArgs?: {
    [key: string]: any;
  };
}

export function readCliArgs(argv: string[]): ParsedArgs {
  const unknownFlags: string[] = [];
  const flags = getopts(argv, {
    boolean: [
      'oss',
      'no-oss',
      'skip-archives',
      'skip-os-packages',
      'rpm',
      'deb',
      'docker',
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
      docker: null,
      oss: null,
      'version-qualifier': '',
    },
    unknown: flag => {
      unknownFlags.push(flag);
      return false;
    },
  });

  if (unknownFlags.length || flags.help) {
    return {
      showHelp: true,
      unknownFlags,
    };
  }

  // In order to build a docker image we always need
  // to generate all the platforms
  if (flags.docker) {
    flags['all-platforms'] = true;
  }

  const log = new ToolingLog({
    level: pickLevelFromFlags(flags, {
      default: flags.debug === false ? 'info' : 'debug',
    }),
    writeTo: process.stdout,
  });

  function isOsPackageDesired(name: string) {
    if (flags['skip-os-packages'] || !flags['all-platforms']) {
      return false;
    }

    // build all if no flags specified
    if (flags.rpm === null && flags.deb === null && flags.docker === null) {
      return true;
    }

    return Boolean(flags[name]);
  }

  return {
    showHelp: false,
    unknownFlags: [],
    log,
    buildArgs: {
      isRelease: Boolean(flags.release),
      versionQualifier: flags['version-qualifier'],
      buildOssDist: flags.oss !== false,
      buildDefaultDist: !flags.oss,
      downloadFreshNode: !Boolean(flags['skip-node-download']),
      createArchives: !Boolean(flags['skip-archives']),
      createRpmPackage: isOsPackageDesired('rpm'),
      createDebPackage: isOsPackageDesired('deb'),
      createDockerPackage: isOsPackageDesired('docker'),
      targetAllPlatforms: Boolean(flags['all-platforms']),
    },
  };
}
