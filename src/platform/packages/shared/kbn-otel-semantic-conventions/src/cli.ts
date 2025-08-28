/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runGenerateOtelSemconvCli } from './generate';

export function cli() {
  process.stdout.write('🚀 Starting OpenTelemetry Semantic Conventions processing...\n');

  try {
    runGenerateOtelSemconvCli();
    process.stdout.write(
      '✅ OpenTelemetry semantic conventions generation completed successfully!\n'
    );
    process.exit(0);
  } catch (error) {
    process.stderr.write(`❌ Processing failed: ${error}\n`);
    process.exit(1);
  }
}
