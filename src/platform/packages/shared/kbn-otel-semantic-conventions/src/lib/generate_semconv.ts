/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { getHardcodedMappings } from './hardcoded_mappings';
import { sortObjectByKeys } from './sorting_utils';
import type {
  ResolvedSemconvYaml,
  YamlGroup,
  SemconvStructuredFieldDefinitions,
  ProcessingResult,
  ProcessingOptions,
  FieldMetadataStructure,
} from '../types';

/**
 * OpenTelemetry to Elasticsearch field type mapping
 */
const OTEL_TO_ES_TYPE_MAP = {
  // Scalar types
  string: 'keyword',
  int: 'long',
  double: 'double',
  boolean: 'boolean',

  // Array types
  'string[]': 'keyword',
  'int[]': 'long',
  'double[]': 'double',
  'boolean[]': 'boolean',

  // Template types
  'template[string]': 'keyword',
  'template[int]': 'long',
  'template[double]': 'double',
  'template[string[]]': 'keyword',

  // Special OTel types
  enum: 'keyword',
  map: 'object',
  'map[]': 'object',
  any: 'keyword',
  undefined: 'keyword',

  // Group types (should not be processed as fields, but just in case)
  attribute_group: 'object',
  metric: 'double',
  span: 'object',
  event: 'object',
  entity: 'object',

  // Malformed types
  "string'": 'keyword', // Handle the typo found in YAML

  // Default fallback
  unknown: 'keyword',
} as const;

/**
 * Map OpenTelemetry field type to Elasticsearch field type
 */
function mapOtelTypeToEsType(otelType?: unknown): string {
  if (!otelType) return 'keyword';

  // Handle simple string types
  if (typeof otelType === 'string') {
    const cleanType = otelType.toLowerCase().trim();
    return OTEL_TO_ES_TYPE_MAP[cleanType as keyof typeof OTEL_TO_ES_TYPE_MAP] || 'keyword';
  }

  // Handle complex type objects (like enum definitions with members)
  if (typeof otelType === 'object' && otelType !== null) {
    const typeObj = otelType as any;

    // Check if it's an enum type with members
    if (typeObj.members && Array.isArray(typeObj.members)) {
      return 'keyword'; // Enum values are always keywords
    }

    // Check if it has a type property
    if (typeObj.type && typeof typeObj.type === 'string') {
      return mapOtelTypeToEsType(typeObj.type);
    }

    // Fallback for other complex objects
    return 'keyword';
  }

  // Handle numbers, booleans, etc.
  return 'keyword';
}

/**
 * Extract the first example from examples array, handling multi-line JSON safely
 */
function extractFirstExample(examples?: unknown[]): string | undefined {
  if (!examples || examples.length === 0) return undefined;

  const firstExample = examples[0];
  if (firstExample === null || firstExample === undefined) return undefined;

  const exampleStr = String(firstExample);

  // Try to parse as JSON and compact it to prevent multi-line formatting issues
  try {
    const parsed = JSON.parse(exampleStr.trim());
    return JSON.stringify(parsed); // Compact JSON format
  } catch {
    // Not valid JSON, normalize as regular string
    return exampleStr
      .replace(/\s+/g, ' ') // Collapse multiple whitespaces into single space
      .trim(); // Remove leading/trailing whitespace
  }
}

/**
 * Clean brief text by removing pipe characters, newlines, and extra whitespace
 */
function cleanBriefText(brief: string): string {
  if (!brief) return '';

  return brief
    .replace(/^\|/gm, '') // Remove pipe characters at start of lines
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace
}

/**
 * Process registry groups (groups with id starting with 'registry.')
 */
function processRegistryGroups(
  groups: YamlGroup[],
  options: ProcessingOptions = {}
): SemconvStructuredFieldDefinitions {
  const registryFields: SemconvStructuredFieldDefinitions = {};

  for (const group of groups) {
    if (!group.id.startsWith('registry.')) {
      continue;
    }

    // Process attributes within the registry group
    if (group.attributes && group.attributes.length > 0) {
      for (const attribute of group.attributes) {
        if (attribute.name && attribute.brief) {
          // Skip deprecated fields unless explicitly included
          if (attribute.deprecated && !options.includeDeprecated) {
            continue;
          }

          const cleanBrief =
            options.cleanBriefText !== false ? cleanBriefText(attribute.brief) : attribute.brief;

          const fieldMetadata: FieldMetadataStructure = {
            name: attribute.name,
            description: cleanBrief,
            type: mapOtelTypeToEsType(attribute.type),
          };

          const example = extractFirstExample(attribute.examples);
          if (example) {
            fieldMetadata.example = example;
          }

          registryFields[attribute.name] = fieldMetadata;
        }
      }
    }
  }

  return registryFields;
}

/**
 * Process metric groups (groups with id starting with 'metric.')
 */
function processMetricGroups(
  groups: YamlGroup[],
  options: ProcessingOptions = {}
): SemconvStructuredFieldDefinitions {
  const metricFields: SemconvStructuredFieldDefinitions = {};

  for (const group of groups) {
    if (!group.id.startsWith('metric.')) {
      continue;
    }

    // Skip deprecated metrics unless explicitly included
    if (group.deprecated && !options.includeDeprecated) {
      continue;
    }

    // Process top-level metric (group.id -> brief)
    if (group.brief) {
      const cleanBrief =
        options.cleanBriefText !== false ? cleanBriefText(group.brief) : group.brief;

      // Convert semantic convention name to actual Kibana field name
      // "metric.go.memory.used" -> "metrics.go.memory.used"
      const kibanaFieldName = group.id.replace(/^metric\./, 'metrics.');

      const fieldMetadata: FieldMetadataStructure = {
        name: kibanaFieldName, // Use Kibana field name (e.g., "metrics.go.memory.used")
        description: cleanBrief,
        type: 'double', // Metrics are always numeric values
      };

      metricFields[kibanaFieldName] = fieldMetadata; // Key is Kibana field name
    }

    // Process attributes within the metric group (name -> brief)
    if (group.attributes && group.attributes.length > 0) {
      for (const attribute of group.attributes) {
        if (attribute.name && attribute.brief) {
          // Skip deprecated attributes unless explicitly included
          if (attribute.deprecated && !options.includeDeprecated) {
            continue;
          }

          const cleanBrief =
            options.cleanBriefText !== false ? cleanBriefText(attribute.brief) : attribute.brief;

          const fieldMetadata: FieldMetadataStructure = {
            name: attribute.name,
            description: cleanBrief,
            type: mapOtelTypeToEsType(attribute.type),
          };

          const example = extractFirstExample(attribute.examples);
          if (example) {
            fieldMetadata.example = example;
          }

          metricFields[attribute.name] = fieldMetadata;
        }
      }
    }
  }

  return metricFields;
}

/**
 * Load and parse the YAML file
 */
function loadYamlFile(filePath: string): ResolvedSemconvYaml {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = yaml.load(fileContent) as ResolvedSemconvYaml;

    if (!parsed || !parsed.groups || !Array.isArray(parsed.groups)) {
      throw new Error('Invalid YAML structure: missing or invalid "groups" property');
    }

    return parsed;
  } catch (error) {
    throw new Error(`Failed to load YAML file ${filePath}: ${error}`);
  }
}
/**
 * Main processing function
 */
export function processSemconvYaml(
  yamlFilePath: string,
  options: ProcessingOptions = {}
): ProcessingResult {
  const yamlData = loadYamlFile(yamlFilePath);

  // Filter and count groups
  const registryGroups = yamlData.groups.filter((g) => g.id.startsWith('registry.'));
  const metricGroups = yamlData.groups.filter((g) => g.id.startsWith('metric.'));

  // Process groups
  const registryFields = processRegistryGroups(registryGroups, options);
  const metricFields = processMetricGroups(metricGroups, options);

  // Get hardcoded mappings from OTLP protocol definitions
  const hardcodedFields = getHardcodedMappings();

  // Merge all fields - hardcoded fields are added first, semantic convention fields can override
  // Apply deterministic sorting to ensure consistent field ordering across builds
  const totalFields = sortObjectByKeys({
    ...hardcodedFields,
    ...registryFields,
    ...metricFields,
  });

  const result: ProcessingResult = {
    registryFields,
    metricFields,
    hardcodedFields,
    totalFields,
    stats: {
      registryGroups: registryGroups.length,
      metricGroups: metricGroups.length,
      hardcodedFields: Object.keys(hardcodedFields).length,
      totalGroups: registryGroups.length + metricGroups.length,
      totalFields: Object.keys(totalFields).length,
    },
  };

  return result;
}

// Export for testing purposes
export { extractFirstExample };
