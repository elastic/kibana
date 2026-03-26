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
import * as fs from 'fs';
import { processSemconvYaml } from './lib/generate_semconv';
import { createSortedEntries } from './lib/sorting_utils';
import type { SemconvStructuredFieldDefinitions, ProcessingResult } from './types/semconv_types';

function generateTypeScriptFile(result: ProcessingResult, outputPath: string): void {
  const { totalFields, stats } = result;

  // Convert structured object to string representation with single quotes (for Prettier compliance)
  function structuredObjectToString(obj: SemconvStructuredFieldDefinitions): string {
    // Use deterministic sorting to ensure consistent field ordering across builds
    const entries = createSortedEntries(obj);
    if (entries.length === 0) {
      return '{}';
    }

    // Enhanced string escaping function to handle all JavaScript string literals safely
    function escapeForJavaScriptString(str: string): string {
      return str
        .replace(/\\/g, '\\\\') // Escape backslashes first
        .replace(/'/g, "\\'") // Escape single quotes
        .replace(/"/g, '\\"') // Escape double quotes for safety
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\r/g, '\\r') // Escape carriage returns
        .replace(/\t/g, '\\t') // Escape tabs
        .replace(
          /[\u0000-\u001F]/g,
          (match) => `\\u${match.charCodeAt(0).toString(16).padStart(4, '0')}`
        ); // Escape control characters
    }

    const lines = entries.map(([key, value]) => {
      const { name, description, type, example } = value;

      const escapedName = escapeForJavaScriptString(name);
      const escapedDescription = escapeForJavaScriptString(description);
      const escapedType = escapeForJavaScriptString(type);

      let fieldObject = `    name: '${escapedName}',\n    description: '${escapedDescription}',\n    type: '${escapedType}',`;

      if (example !== undefined) {
        const escapedExample = escapeForJavaScriptString(String(example));
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
  console.log(`✅ Generated TypeScript file: ${outputPath}`);
  console.log(`📊 Statistics: ${stats.totalFields} fields from ${stats.totalGroups} groups`);
}

export function runGenerateOtelSemconvCli(): void {
  const packageRoot = path.resolve(__dirname, '../');
  const yamlPath = path.join(packageRoot, 'assets', 'resolved-semconv.yaml');
  const outputPath = path.join(packageRoot, 'src', 'generated', 'resolved-semconv.ts');

  console.log('🚀 Starting OpenTelemetry Semantic Conventions processing...');
  console.log(`📁 YAML file: ${yamlPath}`);
  console.log(`📝 Output file: ${outputPath}`);

  try {
    const result = processSemconvYaml(yamlPath, {
      cleanBriefText: true,
      includeDeprecated: false,
      validateOutput: true,
    });

    generateTypeScriptFile(result, outputPath);

    console.log('🎉 Processing completed successfully!');
    console.log(`📋 Generated ${result.stats.totalFields} field definitions`);
  } catch (error) {
    console.error(`❌ Processing failed: ${error}`);
    throw error;
  }
}
