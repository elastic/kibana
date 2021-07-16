/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Readline from 'readline';

import { RunWithCommands, kibanaPackageJson, createFlagError, ToolingLog } from '@kbn/dev-utils';

import { ApmServer } from './apm_server';
import { ApmServerConfig } from './apm_server_install';
import { SnapshotBuild } from './snapshot_build';
import { Staging } from './staging';

async function userHitEnter(log: ToolingLog, msg: string) {
  log.warning(msg);
  await new Promise<void>((resolve) => {
    const rl = Readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '?',
    });

    rl.once('line', () => {
      rl.close();
      resolve();
    });
  });
}

function parseEsUrl(url: string) {
  try {
    return esUrlToConfig(new URL(url));
  } catch (error) {
    throw createFlagError(`invalid --es-url [${url}]: ${error.message}`);
  }
}

function esUrlToConfig(url: URL): NonNullable<ApmServerConfig['elasticsearch']> {
  const username = url.username;
  const password = url.password;
  url.username = '';
  url.password = '';
  return {
    hosts: [url.href],
    username,
    password,
  };
}

export function runApmServerCli() {
  new RunWithCommands({
    description: 'CLI for interacting with APM server snapshots used for Kibana development and CI',
  })
    .command({
      name: 'run',
      description: `
        Run a cached APM server artifact, or download one to run if the cached one is outdated
      `,
      flags: {
        string: ['branch', 'port', 'es-url', 'name'],
        boolean: ['staging'],
        help: `
          --branch       Specify which branch to run, current options are 'master' and '7.x', defaults to {pkg.branch}
          --staged       Run the staging artifacts that were previously downloaded using the 'staging-download' command
          --port         Port to run the apm-server on, defaults to 8200
          --es-url       Elasticsearch URL for the apm-server to index into, include auth in URL if necessary, defaults
                           to http://elastic:changeme@localhost:9200
          --name         When running multiple instances each needs a unique name, defaults to "apm-server"
        `,
      },
      async run({ log, flags }) {
        const branch = flags.branch || kibanaPackageJson.branch;
        const staging = !!flags.staging;
        const name = `${flags.name}` || undefined;

        const port = Number.parseInt(
          typeof flags.port === 'string' && flags.port ? flags.port : '8200',
          10
        );
        if (Number.isNaN(port)) {
          throw createFlagError('expected --port to be a number');
        }

        const esConfig =
          typeof flags['es-url'] === 'string' && flags['es-url']
            ? parseEsUrl(flags['es-url'])
            : undefined;

        await new ApmServer(log).run({
          name,
          branch,
          staging,
          config: {
            port,
            elasticsearch: esConfig,
          },
        });
      },
    })
    .command({
      name: 'staging-download',
      description: `
        Download artifacts from the most recent snapshot build of a specific version and stage it locally for running/testing/promoting.

        Use \`node scripts/apm_server run --staged\` to run the staged downloads.
      `,
      flags: {
        string: ['version'],
        help: `
          --version      Override the version of staged assets, use full version numbers, defaults to '{pkg.version}-SNAPSHOT'
        `,
      },
      async run({ log, flags }) {
        const version = flags.version || undefined;
        if (typeof version !== 'string' && typeof version !== 'undefined') {
          throw createFlagError('only a single --version flag is supported');
        }

        log.info('fetching snapshot builds');
        log.indent(4);
        const snapshot = await SnapshotBuild.fetchMostRecentForVersion(log, version);
        log.success(
          `using packages from build [${snapshot.id}] from ${snapshot.describeTimeSinceBuilt()}`
        );
        log.indent(-4);

        log.info('downloading snapshot packages for supported platforms');
        log.indent(4);
        const staging = new Staging(log);
        await staging.downloadBuilds(snapshot);
        log.success(`downloaded packages for build [${snapshot.id}] to staging`);
        log.indent(-4);
      },
    })
    .command({
      name: 'staging-upload',
      description: `
        Upload staged artifacts to the GCS cache. Expects a propertly configured "gsutil" executable with proper permissions.
      `,
      flags: {
        string: ['branch'],
        boolean: ['force', 'promote'],
        default: {
          promote: null,
        },
        help: `
          --branch       REQUIRED, Upload the staging artifacts to be used for a specific branch
          --force        Run the upload without asking for confirmation
          --promote      After uploading the artifacts promote them to be the "latest" as well
          --no-promote   Skip promotion without asking for confirmation
        `,
      },
      async run({ log, flags }) {
        const branch = flags.branch;
        if (!branch || typeof branch !== 'string') {
          throw createFlagError('--branch is a required flag');
        }

        const force = !!flags.force;
        const promote = flags.promote === null ? null : !!flags.promote;

        const staging = new Staging(log);
        const { artifacts, buildId } = await staging.validateAndRead();
        const artifactList = artifacts.join('\n - ');

        if (force) {
          log.warning(
            `Uploading assets without confirmation [branch=${branch}] [buildId=${buildId}]:\n - ${artifactList}`
          );
        } else {
          await userHitEnter(
            log,
            `Hit ENTER to upload the following files to GCS [branch=${branch}] [buildId=${buildId}]:\n - ${artifactList}`
          );
        }
        await staging.upload(branch, buildId);

        if (promote === false) {
          return;
        }

        if (promote === null) {
          await userHitEnter(
            log,
            `Hit ENTER to promote the uploaded files so that they will be downloaded by anyone else using this tool [branch=${branch}] [buildId=${buildId}]`
          );
        }

        log.warning(`Promoting uploaded [buildId=${buildId}] to "latest" for [branch=${branch}]`);
        await staging.promote(branch);
      },
    })
    .execute();
}
