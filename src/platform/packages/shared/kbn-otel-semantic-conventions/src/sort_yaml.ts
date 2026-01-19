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

interface YamlAttribute {
  name?: string;
  [key: string]: unknown;
}

interface YamlGroup {
  id?: string;
  attributes?: YamlAttribute[];
  [key: string]: unknown;
}

interface ResolvedSemconvYaml {
  groups: YamlGroup[];
  [key: string]: unknown;
}

function sortAttributes(attributes: YamlAttribute[] | undefined): YamlAttribute[] {
  if (!Array.isArray(attributes)) return [];

  // Sort attributes by name for deterministic ordering
  return attributes.sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });
}

function sortGroups(groups: YamlGroup[]): YamlGroup[] {
  if (!Array.isArray(groups)) return [];

  return groups
    .map((group) => {
      // Sort attributes within each group
      const sortedGroup = { ...group };
      if (sortedGroup.attributes) {
        sortedGroup.attributes = sortAttributes(sortedGroup.attributes);
      }
      return sortedGroup;
    })
    .sort((a, b) => {
      // Sort groups by ID for deterministic ordering
      const idA = a.id || '';
      const idB = b.id || '';
      return idA.localeCompare(idB);
    });
}

export function sortYamlFile(inputFile: string, outputFile: string): void {
  try {
    // Read and parse the YAML file
    const yamlContent = fs.readFileSync(inputFile, 'utf8');
    const data = yaml.load(yamlContent) as ResolvedSemconvYaml;

    if (!data || !data.groups) {
      throw new Error('Invalid YAML structure: missing "groups" property');
    }

    // Sort the groups and their attributes
    const sortedData = {
      ...data,
      groups: sortGroups(data.groups),
    };

    // Write the sorted YAML back to file
    const sortedYaml = yaml.dump(sortedData, {
      indent: 2,
      lineWidth: -1, // Disable line wrapping
      noRefs: true, // Disable anchors/references
      sortKeys: false, // We handle sorting manually for better control
    });

    fs.writeFileSync(outputFile, sortedYaml, 'utf8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to sort YAML file: ${errorMessage}`);
  }
}

// CLI function removed - sorting is now done automatically during generation
