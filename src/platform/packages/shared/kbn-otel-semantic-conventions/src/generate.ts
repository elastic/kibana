/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import * as fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';
import { processSemconvYaml } from './lib/generate_semconv';

function generateTypeScriptFile(result: any, outputPath: string, log: ToolingLog): void {
  const timestamp = new Date().toISOString();
  const { totalFields, stats } = result;

  // Convert object to string representation with single quotes (for Prettier compliance)
  function objectToSingleQuoteString(obj: Record<string, string>): string {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return '{}';
    }

    const lines = entries.map(([key, value]) => {
      // Escape single quotes in the value and wrap in single quotes
      const escapedValue = value.replace(/'/g, "\\'");
      return `  '${key}': '${escapedValue}',`;
    });

    return `{\n${lines.join('\n')}\n}`;
  }

  const fieldsString = objectToSingleQuoteString(totalFields);

  const tsContent = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This file is auto-generated. Do not edit manually.
// Generated on: ${timestamp}
// Source: resolved-semconv.yaml
// Registry groups: ${stats.registryGroups}
// Metric groups: ${stats.metricGroups}
// Total fields: ${stats.totalFields}

export const semconvFlat = ${fieldsString} as const;

export type SemconvFieldName = keyof typeof semconvFlat;
export type TSemconvFields = typeof semconvFlat;

// Statistics about the generated data
export const semconvStats = {
  registryGroups: ${stats.registryGroups},
  metricGroups: ${stats.metricGroups},
  totalGroups: ${stats.totalGroups},
  totalFields: ${stats.totalFields},
  generatedAt: '${timestamp}'
} as const;
`;

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, tsContent, 'utf8');
  log.success(`✅ Generated TypeScript file: ${outputPath}`);
  log.info(`📊 Statistics: ${stats.totalFields} fields from ${stats.totalGroups} groups`);
}

export function runGenerateOtelSemconvCli({ log }: { log: ToolingLog }): void {
  const packageRoot = path.resolve(__dirname, '../');
  const yamlPath = path.join(packageRoot, 'assets', 'resolved-semconv.yaml');
  const outputPath = path.join(packageRoot, 'src', 'generated', 'resolved-semconv.ts');

  log.info('🚀 Starting OpenTelemetry Semantic Conventions processing...');
  log.info(`📁 YAML file: ${yamlPath}`);
  log.info(`📝 Output file: ${outputPath}`);

  try {
    const result = processSemconvYaml(yamlPath, {
      cleanBriefText: true,
      includeDeprecated: false,
      validateOutput: true,
    });

    generateTypeScriptFile(result, outputPath, log);

    log.success('🎉 Processing completed successfully!');
    log.info(`📋 Generated ${result.stats.totalFields} field definitions`);
  } catch (error) {
    log.error(`❌ Processing failed: ${error}`);
    process.exit(1);
  }
}
