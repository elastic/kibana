/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Config } from '../../lib';

import { bundleFleetPackages } from './bundle_packages';
import { downloadElasticGpgKey } from './download_elastic_gpg_key';

export async function fleetBuildTasks(pkgDir: string, log: ToolingLog, config: Config) {
  await Promise.all([bundleFleetPackages(pkgDir, log, config), downloadElasticGpgKey(pkgDir, log)]);
}
