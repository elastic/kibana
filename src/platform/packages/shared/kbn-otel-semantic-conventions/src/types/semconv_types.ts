/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
 * Interface representing a single semantic convention field metadata
 */
export interface SemconvFieldMetadata {
  name: string;
  description: string;
  type: string;
  example?: string;
}

/**
 * Interface representing the flattened field definitions (legacy - for backward compatibility)
 */
export interface SemconvFieldDefinitions {
  [fieldName: string]: string; // fieldName -> description
}

/**
 * Interface representing the structured field definitions
 */
export interface SemconvStructuredFieldDefinitions {
  [fieldName: string]: SemconvFieldMetadata;
}

/**
 * Processing result interface
 */
export interface ProcessingResult {
  registryFields: SemconvStructuredFieldDefinitions;
  metricFields: SemconvStructuredFieldDefinitions;
  hardcodedFields: SemconvStructuredFieldDefinitions;
  totalFields: SemconvStructuredFieldDefinitions;
  stats: {
    registryGroups: number;
    metricGroups: number;
    hardcodedFields: number;
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

// Public API type aliases for external consumption
// These provide stable interfaces that don't depend on generated files

/**
 * Public type for OpenTelemetry semantic convention fields
 * Alias for SemconvStructuredFieldDefinitions to provide stable public API
 */
export type TSemconvFields = SemconvStructuredFieldDefinitions;

/**
 * Public type for OpenTelemetry field names
 * Provides type-safe field name access
 */
export type SemconvFieldName = keyof TSemconvFields;

/**
 * Public alias for field definition structure
 * Provides a more descriptive name for external consumers
 */
export type OtelFieldDefinition = SemconvFieldMetadata;

/**
 * Public alias for field collection structure
 * Provides a more descriptive name for external consumers
 */
export type OtelFieldsCollection = SemconvStructuredFieldDefinitions;
