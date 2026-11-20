/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

/** Hidden saved object that stores deployment-wide runtime flag overrides. */
export const FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE = 'feature-flags-overrides';

/** Single document id. Every node polls this one object. */
export const FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID = 'feature-flags-overrides';

export const FEATURE_FLAGS_OVERRIDES_API_PATH = '/internal/feature-flags/overrides';

/** How often each node re-reads the saved object. */
export const RUNTIME_OVERRIDES_POLL_INTERVAL_MS = 10_000;

export const MAX_RUNTIME_OVERRIDES = 500;
export const MAX_FLAG_KEY_LENGTH = 255;
export const MAX_STRING_OVERRIDE_LENGTH = 5_000;

const WRITE_ATTEMPTS = 3;

export type FeatureFlagOverrideValue = boolean | number | string;

export interface FeatureFlagsOverridesAttributes {
  overrides: Record<string, FeatureFlagOverrideValue>;
}

const overrideValueSchema = schema.oneOf([
  schema.boolean(),
  schema.number(),
  schema.string({ maxLength: MAX_STRING_OVERRIDE_LENGTH }),
]);

const overridesRecordSchema = schema.recordOf(
  schema.string({ minLength: 1, maxLength: MAX_FLAG_KEY_LENGTH }),
  overrideValueSchema,
  {
    validate(overrides) {
      if (Object.keys(overrides).length > MAX_RUNTIME_OVERRIDES) {
        return `must contain at most ${MAX_RUNTIME_OVERRIDES} overrides`;
      }
    },
  }
);

export const featureFlagsOverridesAttributesSchema = schema.object({
  overrides: overridesRecordSchema,
});

const featureFlagsOverridesModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: featureFlagsOverridesAttributesSchema.extends({}, { unknowns: 'ignore' }),
    create: featureFlagsOverridesAttributesSchema,
    update: featureFlagsOverridesAttributesSchema,
  },
};

/**
 * One agnostic document shared by every space. Nothing in it is searched, so the
 * mapping stays dynamic:false and stores the override map without indexing it.
 */
export const featureFlagsOverridesSavedObjectType: SavedObjectsType<FeatureFlagsOverridesAttributes> =
  {
    name: FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
    hidden: true,
    hiddenFromHttpApis: true,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {},
    },
    modelVersions: {
      1: featureFlagsOverridesModelVersion,
    },
  };

export function isOverrideValue(value: unknown): value is FeatureFlagOverrideValue {
  return typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string';
}

/** Drops anything that is not a boolean, number, or string override. */
export function normalizeOverrides(value: unknown): Record<string, FeatureFlagOverrideValue> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  const overrides: Record<string, FeatureFlagOverrideValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isOverrideValue(entry)) {
      overrides[key] = entry;
    }
  }
  return overrides;
}

interface StoredOverrides {
  overrides: Record<string, FeatureFlagOverrideValue>;
  version?: string;
}

async function readStoredOverrides(repository: ISavedObjectsRepository): Promise<StoredOverrides> {
  try {
    const document = await repository.get<FeatureFlagsOverridesAttributes>(
      FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
      FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID
    );
    return {
      overrides: normalizeOverrides(document?.attributes?.overrides),
      version: document?.version,
    };
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return { overrides: {} };
    }
    throw error;
  }
}

/**
 * Reads the saved object, applies `mutate`, and writes it back.
 * Retries when another node wins the version check.
 */
export async function updateStoredOverrides(
  repository: ISavedObjectsRepository,
  mutate: (
    current: Record<string, FeatureFlagOverrideValue>
  ) => Record<string, FeatureFlagOverrideValue>
): Promise<Record<string, FeatureFlagOverrideValue>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
    const current = await readStoredOverrides(repository);
    const next = mutate(current.overrides);
    // Validate before writing so a bad payload becomes a 400 instead of a saved object error.
    featureFlagsOverridesAttributesSchema.validate({ overrides: next });

    try {
      if (current.version) {
        await repository.update<FeatureFlagsOverridesAttributes>(
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID,
          { overrides: next },
          { version: current.version, mergeAttributes: false, refresh: false }
        );
      } else {
        await repository.create<FeatureFlagsOverridesAttributes>(
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
          { overrides: next },
          {
            id: FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID,
            overwrite: false,
            refresh: false,
          }
        );
      }
      return next;
    } catch (error) {
      lastError = error;
      if (SavedObjectsErrorHelpers.isConflictError(error) && attempt < WRITE_ATTEMPTS - 1) {
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to store feature flag overrides');
}
