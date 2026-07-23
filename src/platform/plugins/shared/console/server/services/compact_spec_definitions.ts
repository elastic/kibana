/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import { GENERATED_GLOBAL_PREFIX } from '../../common/constants';
import type { SpecDefinitionsJson } from '../types';

const MIN_SHARED_RULE_BYTES = 512;

interface SharedRuleCandidate {
  count: number;
  hash: string;
  serialized: string;
  value: Record<string, unknown> | unknown[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isContainer = (value: unknown): value is Record<string, unknown> | unknown[] =>
  Array.isArray(value) || isRecord(value);

const cloneForTransport = (definitions: SpecDefinitionsJson): SpecDefinitionsJson =>
  JSON.parse(JSON.stringify(definitions)) as SpecDefinitionsJson;

const containsRelativeScopeLink = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.some(containsRelativeScopeLink);
  }
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.__scope_link === 'string' && value.__scope_link.startsWith('.')) {
    return true;
  }
  return Object.values(value).some(containsRelativeScopeLink);
};

const collectCandidates = (value: unknown, candidates: Map<string, SharedRuleCandidate>): void => {
  if (!isContainer(value)) {
    return;
  }
  const serialized = JSON.stringify(value);
  const existing = candidates.get(serialized);
  if (existing) {
    existing.count += 1;
  } else if (!containsRelativeScopeLink(value)) {
    candidates.set(serialized, {
      count: 1,
      hash: createHash('sha256').update(serialized).digest('hex'),
      serialized,
      value,
    });
  }
  Object.values(value).forEach((nestedValue) => collectCandidates(nestedValue, candidates));
};

const selectSharedRules = (
  definitions: SpecDefinitionsJson
): ReadonlyArray<SharedRuleCandidate> => {
  const candidates = new Map<string, SharedRuleCandidate>();
  Object.values(definitions.endpoints).forEach((endpoint) => {
    if (isRecord(endpoint)) {
      collectCandidates(endpoint.data_autocomplete_rules, candidates);
    }
  });
  return [...candidates.values()]
    .filter(
      ({ count, serialized }) => count > 1 && Buffer.byteLength(serialized) >= MIN_SHARED_RULE_BYTES
    )
    .sort(({ hash: left }, { hash: right }) => left.localeCompare(right));
};

const assignGlobalNames = (
  candidates: ReadonlyArray<SharedRuleCandidate>,
  globals: Record<string, unknown>
): ReadonlyMap<string, string> => {
  const usedNames = new Set(Object.keys(globals));
  const names = new Map<string, string>();
  for (const { hash, serialized } of candidates) {
    let hashLength = 8;
    let name = `${GENERATED_GLOBAL_PREFIX}${hash.slice(0, hashLength)}`;
    while (usedNames.has(name) && hashLength < hash.length) {
      hashLength += 2;
      name = `${GENERATED_GLOBAL_PREFIX}${hash.slice(0, hashLength)}`;
    }
    if (usedNames.has(name)) {
      throw new Error(`Unable to assign a unique generated Console global for ${hash}`);
    }
    usedNames.add(name);
    names.set(serialized, name);
  }
  return names;
};

const replaceSharedRules = (
  value: unknown,
  globalNames: ReadonlyMap<string, string>,
  definingRule?: string
): unknown => {
  if (!isContainer(value)) {
    return value;
  }
  const serialized = JSON.stringify(value);
  const globalName = globalNames.get(serialized);
  if (globalName && serialized !== definingRule) {
    return { __scope_link: `GLOBAL.${globalName}` };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => replaceSharedRules(entry, globalNames, definingRule));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      replaceSharedRules(nestedValue, globalNames, definingRule),
    ])
  );
};

/**
 * Builds the browser transport form by sharing repeated body-rule subtrees.
 * Relative scope links stay inline because they are resolved from their endpoint compilation root.
 */
export const compactSpecDefinitions = (definitions: SpecDefinitionsJson): SpecDefinitionsJson => {
  const compactDefinitions = cloneForTransport(definitions);
  const sharedRules = selectSharedRules(compactDefinitions);
  const globalNames = assignGlobalNames(sharedRules, compactDefinitions.globals);

  Object.values(compactDefinitions.endpoints).forEach((endpoint) => {
    if (isRecord(endpoint) && endpoint.data_autocomplete_rules !== undefined) {
      endpoint.data_autocomplete_rules = replaceSharedRules(
        endpoint.data_autocomplete_rules,
        globalNames
      );
    }
  });
  sharedRules.forEach(({ serialized, value }) => {
    const globalName = globalNames.get(serialized);
    if (globalName) {
      compactDefinitions.globals[globalName] = replaceSharedRules(value, globalNames, serialized);
    }
  });

  return compactDefinitions;
};
