/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Document, isMap, isPair, isScalar, isSeq, parseDocument } from 'yaml';
import type { Node, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { isNestedStepKey } from '@kbn/workflows-yaml';

/**
 * Canvas edit-mode mutations. Every function takes the full workflow YAML,
 * applies one structural change through the `yaml` Document AST (so comments,
 * quoting and unknown keys survive), and returns the new YAML string. The
 * Document is the only model: callers dispatch the result straight back into
 * the editor's `yamlString`.
 */
export interface MutationResult {
  readonly success: boolean;
  readonly yaml: string;
  readonly error?: string;
}

const fail = (yaml: string, error: string): MutationResult => ({ success: false, yaml, error });

const detectIndent = (yaml: string): number => {
  for (const line of yaml.split('\n')) {
    const match = line.match(/^( +)\S/);
    if (match) return match[1].length;
  }
  return 2;
};

const serialize = (doc: Document, indent: number): string => doc.toString({ indent, lineWidth: 0 });

const parse = (yaml: string): { doc: Document; error?: string } => {
  const doc = parseDocument(yaml);
  if (doc.errors.length > 0) {
    return { doc, error: `YAML parse errors: ${doc.errors[0].message}` };
  }
  if (doc.contents !== null && !isMap(doc.contents)) {
    return { doc, error: 'YAML root is not a mapping' };
  }
  return { doc };
};

/** Parses a single step fragment (`name: …\ntype: …`) into a map node. */
const parseStepFragment = (fragment: string): { node?: YAMLMap; error?: string } => {
  const doc = parseDocument(fragment);
  if (doc.errors.length > 0) {
    return { error: `Step YAML has errors: ${doc.errors[0].message}` };
  }
  if (!isMap(doc.contents)) {
    return { error: 'Step YAML must be a mapping' };
  }
  return { node: doc.contents };
};

interface StepLocation {
  readonly seq: YAMLSeq;
  readonly index: number;
  readonly node: YAMLMap;
  /** The `fallback` owner (`on-failure` map) when the step is an error-route step. */
  readonly onFailureOwner?: YAMLMap;
}

const findStepInNode = (
  node: unknown,
  stepName: string,
  onFailureOwner?: YAMLMap
): StepLocation | null => {
  if (isSeq(node)) {
    for (let index = 0; index < node.items.length; index++) {
      const item = node.items[index];
      if (isMap(item) && item.get('name') === stepName) {
        return { seq: node, index, node: item, onFailureOwner };
      }
      const found = findStepInNode(item, stepName, onFailureOwner);
      if (found) return found;
    }
    return null;
  }
  if (isMap(node)) {
    const nestedPairs = node.items.filter(
      (pair) => isPair(pair) && isScalar(pair.key) && isNestedStepKey(pair.key.value)
    );
    for (const pair of nestedPairs) {
      const key = (pair.key as Scalar).value as string;
      const isFailureBlock = key === 'on-failure' || key === 'iteration-on-failure';
      const owner = isFailureBlock && isMap(pair.value) ? pair.value : undefined;
      const found = isFailureBlock
        ? findStepInNode(owner?.get('fallback'), stepName, owner)
        : findStepInNode(pair.value, stepName, key === 'fallback' ? node : undefined);
      if (found) return found;
    }
  }
  return null;
};

const locateStep = (doc: Document, stepName: string): StepLocation | null => {
  if (!isMap(doc.contents)) return null;
  return findStepInNode(doc.contents.get('steps'), stepName);
};

/** Collects every step name in the document (any nesting), for unique-name generation. */
export const collectStepNames = (yaml: string): Set<string> => {
  const names = new Set<string>();
  const { doc } = parse(yaml);
  const walk = (node: unknown) => {
    if (isSeq(node)) {
      node.items.forEach(walk);
      return;
    }
    if (!isMap(node)) return;
    const name = node.get('name');
    if (typeof name === 'string') names.add(name);
    for (const pair of node.items) {
      if (isPair(pair) && isScalar(pair.key) && isNestedStepKey(pair.key.value)) walk(pair.value);
    }
  };
  if (isMap(doc.contents)) walk(doc.contents.get('steps'));
  return names;
};

/** Returns `base`, or `base_2`, `base_3`, … until it doesn't collide. */
export const uniqueStepName = (base: string, taken: ReadonlySet<string>): string => {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}_${n}`;
    if (!taken.has(candidate)) return candidate;
  }
};

const ensureTopLevelSeq = (doc: Document, key: 'steps' | 'triggers'): YAMLSeq => {
  if (!isMap(doc.contents)) {
    doc.contents = doc.createNode({}) as YAMLMap;
  }
  const root = doc.contents as YAMLMap;
  const existing = root.get(key);
  if (isSeq(existing)) return existing;
  const seq = doc.createNode([]) as YAMLSeq;
  root.set(key, seq);
  return seq;
};

/**
 * Path from the root `steps` array into a nested branch. Each segment selects
 * `steps[stepIndex]` then opens that step's `steps` (then) or `else` array.
 * An empty path targets the top-level `steps` array.
 */
export type StepInsertPath = ReadonlyArray<{
  readonly stepIndex: number;
  readonly branch: 'steps' | 'else';
}>;

const ensureNestedSeq = (
  doc: Document,
  path: StepInsertPath
): { seq?: YAMLSeq; error?: string } => {
  let seq = ensureTopLevelSeq(doc, 'steps');
  for (const segment of path) {
    const owner = seq.items[segment.stepIndex];
    if (!isMap(owner)) {
      return { error: `Step at index ${segment.stepIndex} not found along insert path` };
    }
    const existing = owner.get(segment.branch);
    if (isSeq(existing)) {
      seq = existing;
      continue;
    }
    const created = doc.createNode([]) as YAMLSeq;
    owner.set(segment.branch, created);
    seq = created;
  }
  return { seq };
};

/** Splices a step (YAML fragment) into the top-level `steps` array at `index`. */
export const insertStepAtIndex = (
  yaml: string,
  stepFragment: string,
  index: number
): MutationResult => insertStepAtPath(yaml, stepFragment, [], index);

/**
 * Splices a step into the steps array reached by `path` (empty = top-level
 * `steps`) at `index`. Creates missing `steps` / `else` sequences along the way.
 */
export const insertStepAtPath = (
  yaml: string,
  stepFragment: string,
  path: StepInsertPath,
  index: number
): MutationResult => {
  const { doc, error } = parse(yaml);
  if (error) return fail(yaml, error);
  const { node, error: fragmentError } = parseStepFragment(stepFragment);
  if (!node) return fail(yaml, fragmentError ?? 'Invalid step');

  const { seq, error: pathError } = ensureNestedSeq(doc, path);
  if (!seq) return fail(yaml, pathError ?? 'Invalid insert path');

  const clamped = Math.max(0, Math.min(index, seq.items.length));
  seq.items.splice(clamped, 0, node);
  return { success: true, yaml: serialize(doc, detectIndent(yaml)) };
};

/** Appends a trigger (YAML fragment, `type: …`) to `triggers`. */
export const appendTrigger = (yaml: string, triggerFragment: string): MutationResult => {
  const { doc, error } = parse(yaml);
  if (error) return fail(yaml, error);
  const { node, error: fragmentError } = parseStepFragment(triggerFragment);
  if (!node) return fail(yaml, fragmentError ?? 'Invalid trigger');

  const triggers = ensureTopLevelSeq(doc, 'triggers');
  triggers.items.push(node);
  return { success: true, yaml: serialize(doc, detectIndent(yaml)) };
};

/** Removes the trigger at declaration index `triggerIndex`. */
export const deleteTrigger = (yaml: string, triggerIndex: number): MutationResult => {
  const { doc, error } = parse(yaml);
  if (error) return fail(yaml, error);
  const triggers = isMap(doc.contents) ? doc.contents.get('triggers') : undefined;
  if (!isSeq(triggers) || triggerIndex < 0 || triggerIndex >= triggers.items.length) {
    return fail(yaml, `Trigger #${triggerIndex} not found`);
  }
  triggers.items.splice(triggerIndex, 1);
  if (triggers.items.length === 0 && isMap(doc.contents)) {
    doc.contents.delete('triggers');
  }
  return { success: true, yaml: serialize(doc, detectIndent(yaml)) };
};

/** Extracts a trigger's YAML fragment (a mapping, comments included). */
export const getTriggerFragment = (yaml: string, triggerIndex: number): string | undefined => {
  const doc = parseDocument(yaml);
  const triggers = isMap(doc.contents) ? doc.contents.get('triggers') : undefined;
  if (!isSeq(triggers) || triggerIndex < 0 || triggerIndex >= triggers.items.length) {
    return undefined;
  }
  const item = triggers.items[triggerIndex];
  if (!isMap(item)) return undefined;
  const fragment = new Document();
  fragment.contents = item.clone() as Node;
  return fragment.toString({ indent: detectIndent(yaml), lineWidth: 0 });
};

/**
 * Replaces the trigger at `triggerIndex` with the parsed fragment. Comments and
 * unknown keys inside the fragment are carried over verbatim.
 */
export const replaceTriggerFragment = (
  yaml: string,
  triggerIndex: number,
  triggerFragment: string
): MutationResult => {
  const { doc, error } = parse(yaml);
  if (error) return fail(yaml, error);
  const triggers = isMap(doc.contents) ? doc.contents.get('triggers') : undefined;
  if (!isSeq(triggers) || triggerIndex < 0 || triggerIndex >= triggers.items.length) {
    return fail(yaml, `Trigger #${triggerIndex} not found`);
  }
  const { node, error: fragmentError } = parseStepFragment(triggerFragment);
  if (!node) return fail(yaml, fragmentError ?? 'Invalid trigger');

  triggers.items[triggerIndex] = node;
  return { success: true, yaml: serialize(doc, detectIndent(yaml)) };
};

/**
 * Sets `on-failure.fallback` on `stepName` to contain the given step, keeping
 * any sibling `on-failure` keys (retry / continue) intact.
 */
export const setStepFallback = (
  yaml: string,
  stepName: string,
  stepFragment: string
): MutationResult => {
  const { doc, error } = parse(yaml);
  if (error) return fail(yaml, error);
  const location = locateStep(doc, stepName);
  if (!location) return fail(yaml, `Step "${stepName}" not found`);
  const { node: fallbackStep, error: fragmentError } = parseStepFragment(stepFragment);
  if (!fallbackStep) return fail(yaml, fragmentError ?? 'Invalid step');

  const existing = location.node.get('on-failure');
  const onFailure = isMap(existing) ? existing : (doc.createNode({}) as YAMLMap);
  onFailure.set('fallback', doc.createNode([fallbackStep]));
  if (!isMap(existing)) location.node.set('on-failure', onFailure);
  return { success: true, yaml: serialize(doc, detectIndent(yaml)) };
};

/**
 * Sets `on-failure.fallback` on a single step YAML fragment (panel-local),
 * keeping sibling `on-failure` keys intact.
 */
export const applyFallbackToStepFragment = (
  stepFragment: string,
  fallbackStepFragment: string
): { success: true; fragment: string } | { success: false; error: string } => {
  const { node: fallbackStep, error: fragmentError } = parseStepFragment(fallbackStepFragment);
  if (!fallbackStep) {
    return { success: false, error: fragmentError ?? 'Invalid fallback step' };
  }
  const doc = parseDocument(stepFragment);
  if (doc.errors.length > 0 || !isMap(doc.contents)) {
    return { success: false, error: 'Step YAML must be a mapping' };
  }
  const existing = doc.contents.get('on-failure');
  const onFailure = isMap(existing) ? existing : (doc.createNode({}) as YAMLMap);
  onFailure.set('fallback', doc.createNode([fallbackStep]));
  if (!isMap(existing)) doc.contents.set('on-failure', onFailure);
  return {
    success: true,
    fragment: doc.toString({ indent: detectIndent(stepFragment), lineWidth: 0 }),
  };
};

/**
 * Deletes a step by name. A step's own `on-failure` branch goes with it. When
 * the step is a fallback step, its parent's error route is cleared instead.
 */
export const deleteStepByName = (yaml: string, stepName: string): MutationResult => {
  const { doc, error } = parse(yaml);
  if (error) return fail(yaml, error);
  const location = locateStep(doc, stepName);
  if (!location) return fail(yaml, `Step "${stepName}" not found`);

  location.seq.items.splice(location.index, 1);

  const { onFailureOwner } = location;
  if (onFailureOwner && location.seq.items.length === 0) {
    onFailureOwner.delete('fallback');
    if (onFailureOwner.items.length === 0) {
      removeChildMap(doc, onFailureOwner);
    }
  }
  return { success: true, yaml: serialize(doc, detectIndent(yaml)) };
};

/** Removes the pair whose value is `target` from whichever map owns it. */
const removeChildMap = (doc: Document, target: YAMLMap): void => {
  const visit = (node: unknown): boolean => {
    if (isSeq(node)) return node.items.some(visit);
    if (!isMap(node)) return false;
    const idx = node.items.findIndex((p) => isPair(p) && p.value === target);
    if (idx >= 0) {
      node.items.splice(idx, 1);
      return true;
    }
    return node.items.some((p) => isPair(p) && visit(p.value));
  };
  visit(doc.contents);
};

/** Inserts a copy of `stepName` directly below it, named `<name> copy` (made unique). */
export const duplicateStep = (
  yaml: string,
  stepName: string
): MutationResult & { newName?: string } => {
  const { doc, error } = parse(yaml);
  if (error) return fail(yaml, error);
  const location = locateStep(doc, stepName);
  if (!location) return fail(yaml, `Step "${stepName}" not found`);

  const copy = location.node.clone() as YAMLMap;
  const taken = collectStepNames(yaml);
  const newName = uniqueStepName(`${stepName} copy`, taken);
  copy.set('name', newName);
  location.seq.items.splice(location.index + 1, 0, copy);
  return { success: true, yaml: serialize(doc, detectIndent(yaml)), newName };
};

/** Extracts a step's YAML fragment (a mapping, comments included). */
export const getStepFragment = (yaml: string, stepName: string): string | undefined => {
  const doc = parseDocument(yaml);
  const location = locateStep(doc, stepName);
  if (!location) return undefined;
  const fragment = new Document();
  fragment.contents = location.node.clone() as Node;
  return fragment.toString({ indent: detectIndent(yaml), lineWidth: 0 });
};

/**
 * Replaces the step named `stepName` with the parsed fragment. Nested steps,
 * comments and unknown keys inside the fragment are carried over verbatim.
 */
export const replaceStepFragment = (
  yaml: string,
  stepName: string,
  stepFragment: string
): MutationResult => {
  const { doc, error } = parse(yaml);
  if (error) return fail(yaml, error);
  const location = locateStep(doc, stepName);
  if (!location) return fail(yaml, `Step "${stepName}" not found`);
  const { node, error: fragmentError } = parseStepFragment(stepFragment);
  if (!node) return fail(yaml, fragmentError ?? 'Invalid step');

  location.seq.items[location.index] = node;
  return { success: true, yaml: serialize(doc, detectIndent(yaml)) };
};
