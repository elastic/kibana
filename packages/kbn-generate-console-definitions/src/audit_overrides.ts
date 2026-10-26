/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import fs from 'fs';
import Path from 'path';
import { isEqual } from 'lodash';
import type { EndpointDefinition, EndpointDescription } from '@kbn/console-plugin/common/types';

const AUDIT_VERSION = 1 as const;
const WHOLE_BODY_KEY = '<body>';
// Mirrors the body compiler's atomic-rule keys (see AUTOCOMPLETE_ATOMIC_RULE_KEYS in
// console-plugin common constants). Kept local so this dev tool does not depend on the
// plugin's runtime constants; keep the two lists in sync if the compiler gains a new key.
const OVERRIDE_ATOMIC_RULE_KEYS = ['__scope_link', '__one_of', '__any_of'] as const;

export interface ConflictFingerprint {
  generatedHash: string;
}

export interface OverrideAuditState {
  version: typeof AUDIT_VERSION;
  conflicts: Record<string, ConflictFingerprint>;
  orphanOverrides: string[];
}

export interface OverrideAuditDiff {
  addedConflicts: string[];
  changedConflicts: string[];
  removedConflicts: string[];
  addedOrphans: string[];
  removedOrphans: string[];
}

export const OVERRIDE_AUDIT_BASELINE_FILE = Path.resolve(
  __dirname,
  'override_conflict_baseline.json'
);

const canonicalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, canonicalizeValue(nestedValue)])
    );
  }
  return value;
};

const hashValue = (value: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(canonicalizeValue(value)))
    .digest('hex');

const fingerprintConflict = (generatedValue: unknown): ConflictFingerprint => ({
  generatedHash: hashValue(generatedValue),
});

const readDefinition = (file: string): [string, EndpointDescription] => {
  const definition = JSON.parse(fs.readFileSync(file, 'utf8')) as EndpointDefinition;
  const entries = Object.entries(definition);
  if (entries.length !== 1) {
    throw new Error(`Expected exactly one endpoint definition in ${file}`);
  }
  return entries[0];
};

const addConflict = ({
  conflicts,
  endpointName,
  key,
  generatedValue,
}: {
  conflicts: Record<string, ConflictFingerprint>;
  endpointName: string;
  key: string;
  generatedValue: unknown;
}) => {
  conflicts[`${endpointName}::${key}`] = fingerprintConflict(generatedValue);
};

const isPlainObjectRule = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isAtomicRule = (value: unknown): boolean =>
  !isPlainObjectRule(value) || OVERRIDE_ATOMIC_RULE_KEYS.some((key) => Object.hasOwn(value, key));

const collectDefinitionConflicts = ({
  endpointName,
  generated,
  override,
  conflicts,
}: {
  endpointName: string;
  generated: EndpointDescription;
  override: EndpointDescription;
  conflicts: Record<string, ConflictFingerprint>;
}) => {
  const generatedRules = generated.data_autocomplete_rules;
  const overrideRules = override.data_autocomplete_rules;
  if (!generatedRules || !overrideRules) {
    return;
  }
  if (isAtomicRule(generatedRules) || isAtomicRule(overrideRules)) {
    if (!isEqual(generatedRules, overrideRules)) {
      addConflict({
        conflicts,
        endpointName,
        key: WHOLE_BODY_KEY,
        generatedValue: generatedRules,
      });
    }
    return;
  }
  for (const [key, overrideValue] of Object.entries(overrideRules)) {
    if (!Object.hasOwn(generatedRules, key) || isEqual(generatedRules[key], overrideValue)) {
      continue;
    }
    addConflict({
      conflicts,
      endpointName,
      key,
      generatedValue: generatedRules[key],
    });
  }
};

export const createOverrideAuditState = ({
  generatedFolder,
  overridesFolder,
}: {
  generatedFolder: string;
  overridesFolder: string;
}): OverrideAuditState => {
  const conflicts: Record<string, ConflictFingerprint> = {};
  const orphanOverrides: string[] = [];
  const overrideFiles = fs
    .readdirSync(overridesFolder)
    .filter((file) => file.endsWith('.json'))
    .sort();

  for (const overrideFile of overrideFiles) {
    const generatedFile = Path.resolve(generatedFolder, overrideFile);
    if (!fs.existsSync(generatedFile)) {
      orphanOverrides.push(overrideFile);
      continue;
    }
    const [overrideEndpointName, override] = readDefinition(
      Path.resolve(overridesFolder, overrideFile)
    );
    const [generatedEndpointName, generated] = readDefinition(generatedFile);
    if (overrideEndpointName !== generatedEndpointName) {
      throw new Error(
        `Endpoint mismatch in ${overrideFile}: ${overrideEndpointName} !== ${generatedEndpointName}`
      );
    }
    collectDefinitionConflicts({
      endpointName: generatedEndpointName,
      generated,
      override,
      conflicts,
    });
  }

  return {
    version: AUDIT_VERSION,
    conflicts: Object.fromEntries(
      Object.entries(conflicts).sort(([left], [right]) => left.localeCompare(right))
    ),
    orphanOverrides,
  };
};

export const readOverrideAuditState = (file: string): OverrideAuditState =>
  JSON.parse(fs.readFileSync(file, 'utf8')) as OverrideAuditState;

export const writeOverrideAuditState = (file: string, state: OverrideAuditState) => {
  fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
};

const difference = (left: string[], right: string[]): string[] =>
  left.filter((value) => !right.includes(value));

export const compareOverrideAuditStates = (
  baseline: OverrideAuditState,
  actual: OverrideAuditState
): OverrideAuditDiff => {
  if (baseline.version !== AUDIT_VERSION || actual.version !== AUDIT_VERSION) {
    throw new Error(`Unsupported override audit version`);
  }
  const baselineKeys = Object.keys(baseline.conflicts);
  const actualKeys = Object.keys(actual.conflicts);
  const sharedKeys = baselineKeys.filter((key) => Object.hasOwn(actual.conflicts, key));
  return {
    addedConflicts: difference(actualKeys, baselineKeys),
    changedConflicts: sharedKeys.filter(
      (key) => !isEqual(baseline.conflicts[key], actual.conflicts[key])
    ),
    removedConflicts: difference(baselineKeys, actualKeys),
    addedOrphans: difference(actual.orphanOverrides, baseline.orphanOverrides),
    removedOrphans: difference(baseline.orphanOverrides, actual.orphanOverrides),
  };
};

export const hasOverrideAuditChanges = (diff: OverrideAuditDiff): boolean =>
  Object.values(diff).some((entries) => entries.length > 0);

export const formatOverrideAuditDiff = (diff: OverrideAuditDiff): string => {
  const sections = [
    ['New conflicts', diff.addedConflicts],
    ['Changed conflicts', diff.changedConflicts],
    ['Resolved conflicts', diff.removedConflicts],
    ['New orphan overrides', diff.addedOrphans],
    ['Resolved orphan overrides', diff.removedOrphans],
  ] as const;
  return sections
    .filter(([, entries]) => entries.length > 0)
    .map(([title, entries]) => `${title}:\n${entries.map((entry) => `  - ${entry}`).join('\n')}`)
    .join('\n\n');
};
