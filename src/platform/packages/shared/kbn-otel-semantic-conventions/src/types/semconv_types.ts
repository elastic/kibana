/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Interface representing a single attribute in a YAML group
 */
export interface YamlAttribute {
  name?: string;
  type?: string;
  brief?: string;
  examples?: unknown[];
  requirement_level?: string;
  stability?: string;
  deprecated?: boolean;
  note?: string;
}

/**
 * Interface representing a group in the YAML file
 */
export interface YamlGroup {
  id: string;
  type: 'attribute_group' | 'metric' | string;
  brief?: string;
  note?: string;
  stability?: string;
  attributes?: YamlAttribute[];
  metric_name?: string;
  instrument?: string;
  unit?: string;
  deprecated?: {
    reason?: string;
    renamed_to?: string;
  };
  lineage?: unknown;
  display_name?: string;
}

/**
 * Interface representing the root structure of the resolved semconv YAML
 */
export interface ResolvedSemconvYaml {
  groups: YamlGroup[];
}

/**
 * Interface representing the flattened field definitions
 */
export interface SemconvFieldDefinitions {
  [fieldName: string]: string; // fieldName -> description
}

/**
 * Processing result interface
 */
export interface ProcessingResult {
  registryFields: SemconvFieldDefinitions;
  metricFields: SemconvFieldDefinitions;
  totalFields: SemconvFieldDefinitions;
  stats: {
    registryGroups: number;
    metricGroups: number;
    totalGroups: number;
    totalFields: number;
  };
}

/**
 * Processing options interface
 */
export interface ProcessingOptions {
  includeDeprecated?: boolean;
  cleanBriefText?: boolean;
  validateOutput?: boolean;
}
