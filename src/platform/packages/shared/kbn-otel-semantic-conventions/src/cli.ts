/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import * as path from 'path';
import { runGenerateOtelSemconvCli } from './generate';
import { sortYamlFile } from './sort_yaml';

export function cli() {
  console.log('🚀 Starting OpenTelemetry Semantic Conventions processing...');

  const packageRoot = path.resolve(__dirname, '../');
  const yamlPath = path.join(packageRoot, 'assets', 'resolved-semconv.yaml');

  // Step 1: Sort YAML for deterministic ordering
  try {
    console.log('📋 Sorting YAML for deterministic field ordering...');
    sortYamlFile(yamlPath, yamlPath); // Sort in place
    console.log('✅ YAML sorted successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ YAML sorting failed: ${errorMessage}`);
    console.error(`📁 YAML file path: ${yamlPath}`);
    process.exit(1);
  }

  // Step 2: Generate TypeScript from the sorted YAML
  try {
    runGenerateOtelSemconvCli();
    console.log('✅ OpenTelemetry semantic conventions generation completed successfully!');
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ TypeScript generation failed: ${errorMessage}`);
    console.error(`📁 YAML source: ${yamlPath}`);
    process.exit(1);
  }
}
