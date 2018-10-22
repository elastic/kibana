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

import { resolve } from 'path';

import getopts from 'getopts';
import dedent from 'dedent';
import chalk from 'chalk';

import { ToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';
import { buildDistributables } from './build_distributables';
import { isErrorLogged } from './lib';

// ensure the cwd() is always the repo root
process.chdir(resolve(__dirname, '../../../'));

const unknownFlags = [];
const flags = getopts(process.argv.slice(0), {
  boolean: [
    'oss',
    'no-oss',
    'skip-archives',
    'skip-os-packages',
    'rpm',
    'deb',
    'release',
    'skip-node-download',
    'verbose',
    'debug',
  ],
  alias: {
    v: 'verbose',
    d: 'debug',
  },
  default: {
    debug: true
  },
  unknown: (flag) => {
    unknownFlags.push(flag);
  }
});

if (unknownFlags.length && !flags.help) {
  const pluralized = unknownFlags.length > 1 ? 'flags' : 'flag';
  console.log(chalk`\n{red Unknown ${pluralized}: ${unknownFlags.join(', ')}}\n`);
  flags.help = true;
}

if (flags.help) {
  console.log(
    dedent(chalk`
      {dim usage:} node scripts/build

      build the Kibana distributable

      options:
        --oss                   {dim Only produce the OSS distributable of Kibana}
        --no-oss                {dim Only produce the default distributable of Kibana}
        --skip-archives         {dim Don't produce tar/zip archives}
        --skip-os-packages      {dim Don't produce rpm/deb packages}
        --rpm                   {dim Only build the rpm package}
        --deb                   {dim Only build the deb package}
        --release               {dim Produce a release-ready distributable}
        --skip-node-download    {dim Reuse existing downloads of node.js}
        --verbose,-v            {dim Turn on verbose logging}
        --no-debug              {dim Turn off debug logging}
    `) + '\n'
  );
  process.exit(1);
}

const log = new ToolingLog({
  level: pickLevelFromFlags(flags, {
    default: flags.debug === false ? 'info' : 'debug'
  }),
  writeTo: process.stdout
});

function isOsPackageDesired(name) {
  if (flags['skip-os-packages']) {
    return false;
  }

  // build all if no flags specified
  if (flags.rpm === undefined && flags.deb === undefined) {
    return true;
  }

  return Boolean(flags[name]);
}

buildDistributables({
  log,
  isRelease: Boolean(flags.release),
  buildOssDist: flags.oss !== false,
  buildDefaultDist: !flags.oss,
  downloadFreshNode: !Boolean(flags['skip-node-download']),
  createArchives: !Boolean(flags['skip-archives']),
  createRpmPackage: isOsPackageDesired('rpm'),
  createDebPackage: isOsPackageDesired('deb'),
}).catch(error => {
  if (!isErrorLogged(error)) {
    log.error('Uncaught error');
    log.error(error);
  }

  process.exit(1);
});
