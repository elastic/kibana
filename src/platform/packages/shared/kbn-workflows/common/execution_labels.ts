/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const EXECUTION_LABEL_KEY_PATTERN = /^[a-z][a-z0-9_.]{0,63}$/;
export const EXECUTION_LABELS_MAX_KEYS = 32;
export const EXECUTION_LABEL_VALUE_MAX_LENGTH = 256;

export type ExecutionLabelValue = string | number | boolean;
/** Labels as accepted from callers: scalar values only. */
export type ExecutionLabelsInput = Readonly<Record<string, ExecutionLabelValue>>;
/** Labels as stored: flattened values are keyword-like, so every value is a string. */
export type ExecutionLabels = Readonly<Record<string, string>>;
/** Maps a label namespace (the key segment before the first dot) to its owning plugin id. */
export type ExecutionLabelNamespaces = ReadonlyMap<string, string>;

export class ExecutionLabelsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionLabelsError';
  }
}

const isScalar = (value: unknown): value is ExecutionLabelValue =>
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));

const getNamespace = (key: string): string => key.slice(0, key.indexOf('.'));

/** Validates caller-supplied labels and stringifies their values for flattened storage. */
export const normalizeExecutionLabels = (input: unknown): ExecutionLabels => {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ExecutionLabelsError('Execution labels must be an object of scalar values');
  }
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > EXECUTION_LABELS_MAX_KEYS) {
    throw new ExecutionLabelsError(
      `Execution labels allow at most ${EXECUTION_LABELS_MAX_KEYS} keys, received ${entries.length}`
    );
  }
  const normalized: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!EXECUTION_LABEL_KEY_PATTERN.test(key) || !key.includes('.')) {
      throw new ExecutionLabelsError(
        `Execution label key "${key}" must be a namespaced key matching ${EXECUTION_LABEL_KEY_PATTERN}`
      );
    }
    if (!isScalar(value)) {
      throw new ExecutionLabelsError(
        `Execution label "${key}" must be a string, number or boolean`
      );
    }
    const serialized = String(value);
    if (serialized.length > EXECUTION_LABEL_VALUE_MAX_LENGTH) {
      throw new ExecutionLabelsError(
        `Execution label "${key}" exceeds ${EXECUTION_LABEL_VALUE_MAX_LENGTH} characters`
      );
    }
    normalized[key] = serialized;
  }
  return normalized;
};

/** Rejects any key whose namespace is unregistered or registered to another owner. */
export const assertExecutionLabelsOwnedBy = (
  labels: ExecutionLabels,
  ownerId: string,
  namespaces: ExecutionLabelNamespaces
): void => {
  for (const key of Object.keys(labels)) {
    const namespace = getNamespace(key);
    const registeredOwner = namespaces.get(namespace);
    if (registeredOwner === undefined) {
      throw new ExecutionLabelsError(`Execution label namespace "${namespace}" is not registered`);
    }
    if (registeredOwner !== ownerId) {
      throw new ExecutionLabelsError(
        `Execution label "${key}" is owned by "${registeredOwner}", not "${ownerId}"`
      );
    }
  }
};

/**
 * Merges an update onto stored labels. Keys are never deleted, an immutable key cannot change once
 * set, and the merged result still honors the key bound.
 */
export const mergeExecutionLabels = (
  existing: ExecutionLabels | undefined,
  update: ExecutionLabels,
  immutableKeys: ReadonlySet<string> = new Set()
): ExecutionLabels => {
  const current = existing ?? {};
  for (const key of Object.keys(update)) {
    if (immutableKeys.has(key) && key in current && current[key] !== update[key]) {
      throw new ExecutionLabelsError(`Execution label "${key}" is immutable`);
    }
  }
  const merged = { ...current, ...update };
  if (Object.keys(merged).length > EXECUTION_LABELS_MAX_KEYS) {
    throw new ExecutionLabelsError(
      `Execution labels allow at most ${EXECUTION_LABELS_MAX_KEYS} keys after merge`
    );
  }
  return merged;
};

/** True when stored labels carry every immutable identity label with the expected value. */
export const matchesImmutableIdentity = (
  stored: ExecutionLabels | undefined,
  identity: ExecutionLabels
): boolean =>
  Object.entries(identity).every(([key, value]) => stored !== undefined && stored[key] === value);
