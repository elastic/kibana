/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/**
 * Reserved document field used to track the schema version of each persisted document.
 * Managed internally by the adapter — consumers should not read or write this field.
 */
export const VERSION_FIELD = '__version' as const;

type MaybePromise<T> = T | Promise<T>;

interface VersionDefinition {
  version: number;
  schema: z.ZodType;
  migrate?: (input: unknown) => MaybePromise<unknown>;
}

interface JsonSchemaNode {
  properties?: Record<string, JsonSchemaNode>;
  allOf?: JsonSchemaNode[];
  anyOf?: JsonSchemaNode[];
  oneOf?: JsonSchemaNode[];
}

/**
 * Collects all property paths from a JSON Schema node as flattened dotted strings
 * (e.g. `['name', 'metadata.createdAt', 'metadata.tags']`), traversing
 * `allOf`/`anyOf`/`oneOf` branches produced by Zod wrapper types.
 */
function collectPaths(node: JsonSchemaNode, prefix: string = ''): string[] {
  const paths: string[] = [];

  if (node.properties) {
    for (const [key, child] of Object.entries(node.properties)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      paths.push(fullPath);
      paths.push(...collectPaths(child, fullPath));
    }
  }

  for (const keyword of ['allOf', 'anyOf', 'oneOf'] as const) {
    node[keyword]?.forEach((branch) => {
      paths.push(...collectPaths(branch, prefix));
    });
  }

  return paths;
}

/**
 * Extracts all property paths from a Zod schema as flattened dotted strings
 * (e.g. `['name', 'metadata.createdAt']`). Handles all Zod wrapper types
 * by delegating to `z.toJSONSchema()`.
 *
 * Returns `null` when the schema has no object properties (e.g. `z.string()`).
 */
export function getSchemaPaths(schema: z.ZodType): string[] | null {
  try {
    const jsonSchema = z.toJSONSchema(schema) as JsonSchemaNode;
    const paths = [...new Set(collectPaths(jsonSchema))];
    return paths.length > 0 ? paths : null;
  } catch {
    return null;
  }
}

/**
 * Immutable result of `defineVersioning(...).build()`.
 *
 * Holds an ordered chain of schema versions and provides a `migrate` method
 * that moves a document from any historical version to the latest, validating
 * with zod at every intermediate step.
 */
export class StorageSchemaVersioning<TLatest> {
  readonly latestVersion: number;
  readonly latestSchema: z.ZodType<TLatest>;
  private readonly definitions: ReadonlyArray<VersionDefinition>;

  constructor(definitions: ReadonlyArray<VersionDefinition>) {
    if (definitions.length === 0) {
      throw new Error('At least one version definition is required');
    }

    definitions.forEach((def, index) => {
      const expectedVersion = index + 1;
      if (def.version !== expectedVersion) {
        throw new Error(
          `Version definitions must be sequential: expected version ${expectedVersion}, got ${def.version}`
        );
      }
      if (index > 0 && typeof def.migrate !== 'function') {
        throw new Error(`Version ${def.version} must provide a migrate function`);
      }
    });

    this.definitions = definitions;
    this.latestVersion = definitions.length;
    this.latestSchema = definitions.at(-1)!.schema as z.ZodType<TLatest>;
  }

  /**
   * Migrate a document from `fromVersion` to the latest version.
   *
   * Each step `await`s the version's `migrate` function (supporting both sync
   * and async migrations) followed by `schema.parse`. Corrupt intermediate
   * states surface immediately as zod validation errors.
   *
   * The async boundary between steps also yields to the event loop, preventing
   * long migration chains from starving other work.
   */
  async migrate(doc: unknown, fromVersion: number): Promise<TLatest> {
    if (!Number.isInteger(fromVersion) || fromVersion < 1 || fromVersion > this.latestVersion) {
      throw new Error(
        `Invalid source version ${fromVersion}: expected an integer between 1 and ${this.latestVersion}`
      );
    }

    let current: unknown = this.definitions[fromVersion - 1].schema.parse(doc);

    for (const step of this.definitions.slice(fromVersion)) {
      current = await step.migrate!(current);
      current = step.schema.parse(current);
    }

    return current as TLatest;
  }
}

/**
 * Fluent builder for constructing a `StorageSchemaVersioning` instance.
 *
 * Created via `defineVersioning(initialSchema)`, then extended with
 * `.addVersion({ schema, migrate })` for each subsequent version.
 *
 * The type parameter `TLatestOutput` tracks the output type of the most
 * recently added schema, ensuring that each `migrate` callback receives
 * the correctly typed output of the previous version.
 */
export interface VersioningBuilder<TLatestOutput> {
  /**
   * Append a new schema version.
   *
   * @param options.schema - Zod schema that validates documents at this version.
   * @param options.migrate - Transform a document from the previous version's shape
   *   into this version's shape. The input is strictly typed as the output of the
   *   previous version's schema. May return a value or a Promise.
   */
  addVersion<TNextSchema extends z.ZodType>(options: {
    schema: TNextSchema;
    migrate: (input: TLatestOutput) => MaybePromise<z.input<TNextSchema>>;
  }): VersioningBuilder<z.output<TNextSchema>>;

  /**
   * Finalise the version chain and return an immutable `StorageSchemaVersioning`.
   */
  build(): StorageSchemaVersioning<TLatestOutput>;
}

function createBuilder<TLatestOutput>(
  definitions: ReadonlyArray<VersionDefinition>
): VersioningBuilder<TLatestOutput> {
  return {
    addVersion<TNextSchema extends z.ZodType>(options: {
      schema: TNextSchema;
      migrate: (input: TLatestOutput) => MaybePromise<z.input<TNextSchema>>;
    }): VersioningBuilder<z.output<TNextSchema>> {
      return createBuilder<z.output<TNextSchema>>([
        ...definitions,
        {
          version: definitions.length + 1,
          schema: options.schema,
          migrate: options.migrate as (input: unknown) => MaybePromise<unknown>,
        },
      ]);
    },
    build(): StorageSchemaVersioning<TLatestOutput> {
      return new StorageSchemaVersioning<TLatestOutput>(definitions);
    },
  };
}

/**
 * Entry point for defining a versioned document schema.
 *
 * @param initialSchema - Zod schema for version 1 (the base version, no migration needed).
 * @returns A `VersioningBuilder` that can be extended with `.addVersion()` calls.
 *
 * @example
 * ```ts
 * const versioning = defineVersioning(z.object({ foo: z.string() }))
 *   .addVersion({
 *     schema: z.object({ foo: z.string(), bar: z.number() }),
 *     migrate: (prev) => ({ ...prev, bar: 0 }),
 *   })
 *   .build();
 * ```
 */
export function defineVersioning<TSchema extends z.ZodType>(
  initialSchema: TSchema
): VersioningBuilder<z.output<TSchema>> {
  return createBuilder<z.output<TSchema>>([{ version: 1, schema: initialSchema }]);
}
