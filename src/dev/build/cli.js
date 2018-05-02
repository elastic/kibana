import { resolve } from 'path';

import getopts from 'getopts';
import dedent from 'dedent';
import chalk from 'chalk';

import { createToolingLog, pickLevelFromFlags } from '../tooling_log';
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
        --debug,-d              {dim Turn on debug logging}
    `) + '\n'
  );
  process.exit(1);
}

const log = createToolingLog(pickLevelFromFlags(flags));
log.pipe(process.stdout);

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
