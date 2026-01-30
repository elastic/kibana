/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { RUNTIME_FIELD_TYPES } from './constants';

/**
 * Runtime field types
 */
export type RuntimeType = (typeof RUNTIME_FIELD_TYPES)[number];

/**
 * Runtime field primitive types - excluding composite
 */
export type RuntimePrimitiveTypes = Exclude<RuntimeType, 'composite'>;

/**
 * Runtime field definition
 * @public
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RuntimeFieldBase = {
  /**
   * Type of runtime field
   */
  type: RuntimeType;
  /**
   * Runtime field script
   */
  script?: {
    /**
     * Script source
     */
    source: string;
  };
};

/**
 * The RuntimeField that will be sent in the ES Query "runtime_mappings" object
 */
export type RuntimeFieldSpec = RuntimeFieldBase & {
  /**
   * Composite subfields
   */
  fields?: Record<
    string,
    {
      // It is not recursive, we can't create a composite inside a composite.
      type: RuntimePrimitiveTypes;
    }
  >;
};

/**
 * Field attributes that are user configurable
 * @public
 */
export interface FieldConfiguration {
  /**
   * Field format in serialized form
   */
  format?: SerializedFieldFormat | null;
  /**
   * Custom label
   */
  customLabel?: string;
  /**
   * Custom description
   */
  customDescription?: string;
  /**
   * Popularity - used for discover
   */
  popularity?: number;
}

/**
 * This is the RuntimeField interface enhanced with Data view field
 * configuration: field format definition, customLabel or popularity.
 * @public
 */
export interface RuntimeField extends RuntimeFieldBase, FieldConfiguration {
  /**
   * Subfields of composite field
   */
  fields?: RuntimeFieldSubFields;
}

export type RuntimeFieldSubFields = Record<string, RuntimeFieldSubField>;

/**
 * Runtime field composite subfield
 * @public
 */
export interface RuntimeFieldSubField extends FieldConfiguration {
  // It is not recursive, we can't create a composite inside a composite.
  type: RuntimePrimitiveTypes;
}
