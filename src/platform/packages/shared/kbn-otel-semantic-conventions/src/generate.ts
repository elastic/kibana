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
import { processSemconvYaml } from './lib/generate_semconv';

function generateTypeScriptFile(result: any, outputPath: string): void {

  const timestamp = new Date().toISOString();
  const { totalFields, stats } = result;

  // Convert structured object to string representation with single quotes (for Prettier compliance)
  function structuredObjectToString(obj: Record<string, any>): string {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return '{}';
    }

    const lines = entries.map(([key, value]) => {
      const { name, description, type, example } = value;

      // Escape single quotes in strings
      const escapedName = name.replace(/'/g, "\\'");
      const escapedDescription = description.replace(/'/g, "\\'");
      const escapedType = type.replace(/'/g, "\\'");

      let fieldObject = `    name: '${escapedName}',\n    description: '${escapedDescription}',\n    type: '${escapedType}',`;

      if (example !== undefined) {
        const escapedExample = String(example).replace(/'/g, "\\'");
        fieldObject += `\n    example: '${escapedExample}',`;
      }

      return `  '${key}': {\n${fieldObject}\n  },`;
    });

    return `{\n${lines.join('\n')}\n}`;
  }

  const fieldsString = structuredObjectToString(totalFields);

  const tsContent = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * OpenTelemetry semantic conventions field definitions.
 *
 * This file is auto-generated. Do not edit manually.
 * Generated on: ${timestamp}
 * Sources: resolved-semconv.yaml + hardcoded OTLP mappings
 * Registry groups: ${stats.registryGroups}
 * Metric groups: ${stats.metricGroups}
 * Hardcoded fields: ${stats.hardcodedFields}
 * Total fields: ${stats.totalFields}
 *
 * @internal
 *
 * WARNING: This object contains ${stats.totalFields}+ field definitions (~50KB+ minified).
 * Direct import will significantly increase client bundle size.
 *
 * RECOMMENDED USAGE:
 * - Server-side: Import directly for field metadata services
 * - Client-side: Use fields_metadata API endpoints instead of direct import
 * - Build tools: Ensure this is not included in client-side bundles
 *
 * The fields_metadata package provides optimized APIs to prevent
 * bundle size explosions. Use those APIs instead of importing this directly.
 */
export const semconvFlat = ${fieldsString} as const;
`;

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, tsContent, 'utf8');
  process.stdout.write(`✅ Generated TypeScript file: ${outputPath}\n`);
  process.stdout.write(
    `📊 Statistics: ${stats.totalFields} fields from ${stats.totalGroups} groups\n`
  );
}

export function runGenerateOtelSemconvCli(): void {
  const packageRoot = path.resolve(__dirname, '../');
  const yamlPath = path.join(packageRoot, 'assets', 'resolved-semconv.yaml');
  const outputPath = path.join(packageRoot, 'src', 'generated', 'resolved-semconv.ts');

  process.stdout.write('🚀 Starting OpenTelemetry Semantic Conventions processing...\n');
  process.stdout.write(`📁 YAML file: ${yamlPath}\n`);
  process.stdout.write(`📝 Output file: ${outputPath}\n`);

  try {
    const result = processSemconvYaml(yamlPath, {
      cleanBriefText: true,
      includeDeprecated: false,
      validateOutput: true,
    });

    generateTypeScriptFile(result, outputPath);

    process.stdout.write('🎉 Processing completed successfully!\n');
    process.stdout.write(`📋 Generated ${result.stats.totalFields} field definitions\n`);
  } catch (error) {
    process.stderr.write(`❌ Processing failed: ${error}\n`);
    throw error;
  }
}
