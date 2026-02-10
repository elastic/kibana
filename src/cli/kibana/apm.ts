/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
// @ts-nocheck

import { join } from 'path';
import { initApm } from '@kbn/apm-config-loader';
import { initTelemetry } from '@kbn/telemetry';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { name, build } = require('../../../package.json');

const rootDir = join(__dirname, '../../..');
const isKibanaDistributable = Boolean(build && build.distributable === true);

export default function (serviceName: string = name, argv: string[] = process.argv) {
  initApm(argv, rootDir, isKibanaDistributable, serviceName);
  initTelemetry(argv, rootDir, isKibanaDistributable, serviceName);
}
