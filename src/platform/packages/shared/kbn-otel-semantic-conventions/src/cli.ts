/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import { runGenerateOtelSemconvCli } from './generate';

export function cli() {
  console.log('🚀 Starting OpenTelemetry Semantic Conventions processing...');

  try {
    runGenerateOtelSemconvCli();
    console.log('✅ OpenTelemetry semantic conventions generation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Processing failed: ${error}`);
    process.exit(1);
  }
}
