/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { semconvFlat } from '../generated/resolved-semconv';

// ===== CORE TYPES FROM GENERATED FILE (SOURCE OF TRUTH) =====

/**
 * Type derived from the generated semconvFlat constant
 * This is the source of truth for all OTel field types
 */
export type TSemconvFields = typeof semconvFlat;

/**
 * Type-safe field names derived from the generated constant
 */
export type SemconvFieldName = keyof TSemconvFields;

/**
 * Individual field metadata structure (inferred from generated data)
 */
export type SemconvFieldMetadata = TSemconvFields[SemconvFieldName];

/**
 * Interface for field metadata structure used during generation
 * This defines the shape of individual field entries
 */
export interface FieldMetadataStructure {
  name: string;
  description: string;
  type: string;
  example?: string;
}

// ===== YAML PROCESSING TYPES (FOR GENERATION ONLY) =====

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
 * Type for collections of field definitions (used during generation)
 * Note: This uses a generic structure since it's used before the file is generated
 */
export type SemconvStructuredFieldDefinitions = Record<string, FieldMetadataStructure>;

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
