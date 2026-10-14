/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlagOptions, FlagsReader } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { resolve } from 'path';
import { v4 as uuidV4 } from 'uuid';
import {
  ScoutTargetLocationSchema,
  ScoutTestTarget,
  testTargets,
  type ScoutTargetLocation,
} from '@kbn/scout-info';
import { createFlagError } from '@kbn/dev-cli-errors';

export type StartServerOptions = ReturnType<typeof parseStartServerFlags>;

const supportedArchitectures: Set<string> = new Set();
const supportedDomains: Set<string> = new Set();

testTargets.local.forEach((target) => {
  supportedArchitectures.add(target.arch);
  supportedDomains.add(target.domain);
});

const supportedLocations: ScoutTargetLocation[] = ScoutTargetLocationSchema.options;

/**
 * Flags shared by `start-server` and `run-tests`.
 */
export const SERVER_FLAG_OPTIONS: FlagOptions = {
  string: ['location', 'arch', 'domain', 'esFrom', 'kibanaInstallDir'],
  boolean: ['logToFile', 'preserveEsData'],
  default: { location: 'local' },
  help: `
    --location          Where is the test target located (one of: ${supportedLocations.join(
      ', '
    )})) [default: 'local']
    --arch              Server architecture (one of: ${[...supportedArchitectures].join(', ')})
    --domain            Server domain (one of: ${[...supportedDomains].join(', ')})
    --esFrom            Build Elasticsearch from source or run snapshot or serverless. [default: $TEST_ES_FROM or "snapshot"]
    --kibanaInstallDir  Run Kibana from existing install directory instead of from source
    --logToFile         Write the log output from Kibana/ES to files instead of to stdout
    --preserveEsData    Reuse existing serverless ES object store data instead of cleaning it on startup
  `,
};

/**
 * Flags for `start-server`. `--serverConfigSet` is only meaningful here: `run-tests`
 * derives the server config set from the Playwright config path instead.
 */
export const START_SERVER_FLAG_OPTIONS: FlagOptions = {
  ...SERVER_FLAG_OPTIONS,
  string: [...(SERVER_FLAG_OPTIONS.string || []), 'serverConfigSet'],
  default: { ...SERVER_FLAG_OPTIONS.default, serverConfigSet: 'default' },
  help: `
    ${SERVER_FLAG_OPTIONS.help}
    --serverConfigSet   Server configuration name (maps to server config directory name under servers/configs/config_sets, e.g. uiam_local) [default: 'default']
  `,
};

export function parseServerFlags(flags: FlagsReader) {
  let testTarget;
  try {
    testTarget = new ScoutTestTarget(
      flags.requiredString('location'),
      flags.requiredString('arch'),
      flags.requiredString('domain')
    );
  } catch (e) {
    throw createFlagError(e.message);
  }

  if (
    !testTargets
      .forLocation(testTarget.location)
      .find((potentiallyMatchingTarget) => potentiallyMatchingTarget.tag === testTarget.tag)
  ) {
    throw createFlagError(`Unsupported target: ${testTarget.tag}`);
  }

  const esFrom = flags.enum('esFrom', ['source', 'snapshot', 'serverless']);
  const installDir = flags.string('kibanaInstallDir');
  const preserveEsData = flags.boolean('preserveEsData');
  const logsDir = flags.boolean('logToFile')
    ? resolve(REPO_ROOT, 'data/ftr_servers_logs', uuidV4())
    : undefined;

  return {
    testTarget,
    esFrom,
    preserveEsData,
    installDir,
    logsDir,
  };
}

export function parseStartServerFlags(flags: FlagsReader) {
  return {
    ...parseServerFlags(flags),
    serverConfigSet: flags.requiredString('serverConfigSet'),
  };
}
