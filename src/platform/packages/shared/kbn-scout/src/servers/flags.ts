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

export type StartServerOptions = ReturnType<typeof parseServerFlags>;

const supportedArchitectures: Set<string> = new Set();
const supportedDomains: Set<string> = new Set();

testTargets.local.forEach((target) => {
  supportedArchitectures.add(target.arch);
  supportedDomains.add(target.domain);
});

const supportedLocations: ScoutTargetLocation[] = ScoutTargetLocationSchema.options;

export const SERVER_FLAG_OPTIONS: FlagOptions = {
  string: ['location', 'arch', 'domain', 'serverConfigSet', 'esFrom', 'kibanaInstallDir'],
  boolean: ['logToFile'],
  default: { location: 'local', serverConfigSet: 'default' },
  help: `
    --location          Where is the test target located (one of: ${supportedLocations.join(
      ', '
    )})) [default: 'local']
    --arch              Server architecture (one of: ${[...supportedArchitectures].join(', ')})
    --domain            Server domain (one of: ${[...supportedDomains].join(', ')})
    --serverConfigSet   Server configuration name (maps to server config directory name under servers/configs/config_sets, e.g. uiam_local) [default: 'default']
    --esFrom            Build Elasticsearch from source or run snapshot or serverless. [default: $TEST_ES_FROM or "snapshot"]
    --kibanaInstallDir  Run Kibana from existing install directory instead of from source
    --logToFile         Write the log output from Kibana/ES to files instead of to stdout
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

  const serverConfigSet = flags.requiredString('serverConfigSet');
  const esFrom = flags.enum('esFrom', ['source', 'snapshot', 'serverless']);
  const installDir = flags.string('kibanaInstallDir');
  const logsDir = flags.boolean('logToFile')
    ? resolve(REPO_ROOT, 'data/ftr_servers_logs', uuidV4())
    : undefined;

  return {
    testTarget,
    serverConfigSet,
    esFrom,
    installDir,
    logsDir,
  };
}
