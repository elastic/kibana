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
import type {
  ResolvedSemconvYaml,
  YamlGroup,
  SemconvFieldDefinitions,
  ProcessingResult,
  ProcessingOptions,
} from '../types/semconv_types';

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
): SemconvFieldDefinitions {
  const registryFields: SemconvFieldDefinitions = {};

  for (const group of groups) {
    if (!group.id.startsWith('registry.')) {
      continue;
    }

    // Process attributes within the registry group
    if (group.attributes && group.attributes.length > 0) {
      for (const attribute of group.attributes) {
        if (attribute.name && attribute.brief) {
          const cleanBrief =
            options.cleanBriefText !== false ? cleanBriefText(attribute.brief) : attribute.brief;

          // Skip deprecated fields unless explicitly included
          if (attribute.deprecated && !options.includeDeprecated) {
            continue;
          }

          registryFields[attribute.name] = cleanBrief;
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
): SemconvFieldDefinitions {
  const metricFields: SemconvFieldDefinitions = {};

  for (const group of groups) {
    if (!group.id.startsWith('metric.')) {
      continue;
    }

    // Skip deprecated metrics unless explicitly included
    if (group.deprecated && !options.includeDeprecated) {
      continue;
    }

    // Process top-level metric (metric_name -> brief)
    if (group.metric_name && group.brief) {
      const cleanBrief =
        options.cleanBriefText !== false ? cleanBriefText(group.brief) : group.brief;

      metricFields[group.metric_name] = cleanBrief;
    }

    // Process attributes within the metric group (name -> brief)
    if (group.attributes && group.attributes.length > 0) {
      for (const attribute of group.attributes) {
        if (attribute.name && attribute.brief) {
          const cleanBrief =
            options.cleanBriefText !== false ? cleanBriefText(attribute.brief) : attribute.brief;

          // Skip deprecated attributes unless explicitly included
          if (attribute.deprecated && !options.includeDeprecated) {
            continue;
          }

          metricFields[attribute.name] = cleanBrief;
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

  // Merge all fields
  const totalFields = { ...registryFields, ...metricFields };

  const result: ProcessingResult = {
    registryFields,
    metricFields,
    totalFields,
    stats: {
      registryGroups: registryGroups.length,
      metricGroups: metricGroups.length,
      totalGroups: registryGroups.length + metricGroups.length,
      totalFields: Object.keys(totalFields).length,
    },
  };

  return result;
}
