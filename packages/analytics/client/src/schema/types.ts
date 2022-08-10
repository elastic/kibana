/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** Types matching number values **/
export type AllowedSchemaNumberTypes =
  | 'long'
  | 'integer'
  | 'short'
  | 'byte'
  | 'double'
  | 'float'
  | 'date';
/** Types matching string values **/
export type AllowedSchemaStringTypes = 'keyword' | 'text' | 'date';
/** Types matching boolean values **/
export type AllowedSchemaBooleanTypes = 'boolean';

/**
 * Possible type values in the schema
 */
export type AllowedSchemaTypes =
  | AllowedSchemaNumberTypes
  | AllowedSchemaStringTypes
  | AllowedSchemaBooleanTypes;

/**
 * Helper to ensure the declared types match the schema types
 */
export type PossibleSchemaTypes<Value> = Value extends string | Date
  ? AllowedSchemaStringTypes
  : Value extends number
  ? AllowedSchemaNumberTypes
  : Value extends boolean
  ? AllowedSchemaBooleanTypes
  : // allow any schema type from the union if typescript is unable to resolve the exact U type
    AllowedSchemaTypes;

/**
 * Schema to define a primitive value
 */
export interface SchemaChildValue<Value> {
  /** The type of the value */
  type: PossibleSchemaTypes<NonNullable<Value>>;
  /** Meta properties of the value: description and is optional */
  _meta: {
    /** A description of the value */
    description: string; // Intentionally enforcing the descriptions here
  } & SchemaMetaOptional<Value>;
}

/**
 * Type that defines all the possible values that the Schema accepts.
 * These types definitions are helping to identify earlier the possible missing `properties` nesting when
 * manually defining the schemas.
 */
export type SchemaValue<Value> =
  // Always allow the pass_through no matter what the value is
  | {
      /** Type specification of a pass through object */
      type: 'pass_through';
      /** Meta properties of the pass through: description and is optional */
      _meta: {
        /** A description of the value */
        description: string; // Intentionally enforcing the descriptions here
      } & SchemaMetaOptional<Value>;
    }
  | (unknown extends Value
      ? // If the Value is unknown (TS can't infer the type), allow any type of schema
        SchemaArray<unknown, Value> | SchemaObject<Value> | SchemaChildValue<Value>
      : // Otherwise, try to infer the type and enforce the schema
      NonNullable<Value> extends Array<infer U> | ReadonlyArray<infer U>
      ? SchemaArray<U, Value>
      : NonNullable<Value> extends Date
      ? SchemaChildValue<Value>
      : NonNullable<Value> extends object
      ? SchemaObject<Value>
      : SchemaChildValue<Value>);

/**
 * Enforces { optional: true } if the value can be undefined
 */
export type SchemaMetaOptional<Value> = unknown extends Value
  ? { optional?: boolean }
  : undefined extends Value
  ? { optional: true }
  : { optional?: false };

/**
 * Schema meta with optional description
 */
export interface SchemaMeta<Value> {
  /** Meta properties of the pass through: description and is optional */
  _meta?: {
    /** A description of the value */
    description?: string;
  } & SchemaMetaOptional<Value>;
}

/**
 * Schema to represent an array
 */
export interface SchemaArray<Value, Base> extends SchemaMeta<Base> {
  /** The type must be an array */
  type: 'array';
  /** The schema of the items in the array is defined in the `items` property */
  items: SchemaValue<Value>;
}

/**
 * Schema to represent an object
 */
export interface SchemaObject<Value> extends SchemaMeta<Value> {
  /**
   * The schemas of the keys of the object are defined in the `properties` object.
   */
  properties: {
    [Key in keyof Required<Value>]: SchemaValue<Value[Key]>;
  };
}

/**
 * Schema definition to match the structure of the properties provided.
 *
 * @example
 * {
 *   my_keyword: {
 *     type: 'keyword',
 *     _meta: {
 *       description: 'Represents the key property...'
 *     }
 *   },
 *   my_number: {
 *     type: 'long',
 *     _meta: {
 *       description: 'Indicates the number of times...',
 *       optional: true
 *     }
 *   },
 *   my_complex_unknown_meta_object: {
 *     type: 'pass_through',
 *     _meta: {
 *       description: 'Unknown object that contains the key-values...'
 *     }
 *   },
 *   my_array_of_str: {
 *     type: 'array',
 *     items: {
 *       type: 'text',
 *       _meta: {
 *         description: 'List of tags...'
 *       }
 *     }
 *   },
 *   my_object: {
 *     properties: {
 *       my_timestamp: {
 *         type: 'date',
 *         _meta: {
 *           description: 'timestamp when the user...'
 *         }
 *       }
 *     }
 *   },
 *   my_array_of_objects: {
 *     type: 'array',
 *     items: {
 *       properties: {
 *         my_bool_prop: {
 *           type: 'boolean',
 *           _meta: {
 *             description: '`true` when...'
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
export type RootSchema<Base> = SchemaObject<Base>['properties'];
