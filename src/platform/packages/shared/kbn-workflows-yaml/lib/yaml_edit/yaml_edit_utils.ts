/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { Document, isMap, isPair, isScalar, isSeq, parseDocument, Scalar, stringify } from 'yaml';
import type { Node, YAMLMap, YAMLSeq } from 'yaml';
import { WorkflowSchema } from '@kbn/workflows';
import { WORKFLOW_DEFINITION_KEYS_ORDER } from '../../common/yaml/stringify_workflow_definition';
import { getStepNode } from './get_step_node';

interface StepDefinition {
  name: string;
  type: string;
  'connector-id'?: string;
  if?: string;
  foreach?: string;
  with?: Record<string, unknown>;
  output?: Record<string, unknown>;
  steps?: StepDefinition[];
  [key: string]: unknown;
}

interface EditResult {
  success: boolean;
  yaml: string;
  error?: string;
}

const ROOT_PROPERTY_ORDER: readonly string[] = WORKFLOW_DEFINITION_KEYS_ORDER;

const parseForEditing = (yaml: string): { doc: Document; error?: string } => {
  const doc = parseDocument(yaml);
  if (doc.errors.length > 0) {
    return { doc, error: `YAML parse errors: ${doc.errors[0].message}` };
  }
  return { doc };
};

/**
 * Detect the indentation unit used in the document by looking at the first
 * indented line. Falls back to 2 spaces.
 */
const detectIndent = (yaml: string): number => {
  for (const line of yaml.split('\n')) {
    const match = line.match(/^( +)\S/);
    if (match) return match[1].length;
  }
  return 2;
};

/**
 * Stringify a JS value into YAML text at the given indent depth,
 * using the document's indent unit.
 */
const stringifyValue = (value: unknown, indentUnit: number, depth: number): string => {
  const raw = stringify(value, { indent: indentUnit, lineWidth: 0 });
  if (depth === 0) return raw;

  const pad = ' '.repeat(indentUnit * depth);
  return raw
    .split('\n')
    .map((line, i) => (i === 0 || line === '' ? line : `${pad}${line}`))
    .join('\n');
};

/**
 * For a single map pair in `fresh`, find its counterpart in `existing` by key
 * and transfer quoting types for both the key and value subtrees.
 */
const mergeMapPairFormat = (existing: YAMLMap, freshPair: unknown): void => {
  if (!isPair(freshPair) || !isScalar(freshPair.key)) return;

  const freshKey = freshPair.key;
  const existingPair = existing.items.find(
    (p) => isPair(p) && isScalar(p.key) && p.key.value === freshKey.value
  );
  if (!existingPair || !isPair(existingPair)) return;

  if (
    isScalar(existingPair.key) &&
    existingPair.key.value === freshKey.value &&
    existingPair.key.type
  ) {
    freshKey.type = existingPair.key.type;
  }
  mergePreservingFormat(existingPair.value as Node, freshPair.value as Node);
};

/**
 * Walk an existing AST node and a freshly-created node in parallel.
 * For scalar values that are identical, copy the quoting `type` from the
 * existing node so that `stringify` reproduces the original formatting
 * (e.g. `"now-5m"` stays double-quoted instead of becoming plain `now-5m`).
 */
const mergePreservingFormat = (existing: Node | null, fresh: Node | null): void => {
  if (!existing || !fresh) return;

  if (isScalar(existing) && isScalar(fresh)) {
    if (existing.value === fresh.value && existing.type) {
      fresh.type = existing.type;
    }
    return;
  }

  if (isMap(existing) && isMap(fresh)) {
    for (const freshPair of fresh.items) {
      mergeMapPairFormat(existing, freshPair);
    }
    return;
  }

  if (isSeq(existing) && isSeq(fresh)) {
    const len = Math.min(existing.items.length, fresh.items.length);
    for (let i = 0; i < len; i++) {
      mergePreservingFormat(existing.items[i] as Node, fresh.items[i] as Node);
    }
  }
};

const nodeFactory = new Document();

/**
 * Like `stringifyValue` but preserves the quoting style of unchanged scalars
 * by comparing against the original AST node.
 */
const stringifyValuePreservingFormat = (
  value: unknown,
  indentUnit: number,
  depth: number,
  originalNode: Node
): string => {
  const freshNode = nodeFactory.createNode(value);
  mergePreservingFormat(originalNode, freshNode);

  const raw = stringify(freshNode, { indent: indentUnit, lineWidth: 0 });
  if (depth === 0) return raw;

  const pad = ' '.repeat(indentUnit * depth);
  return raw
    .split('\n')
    .map((line, i) => (i === 0 || line === '' ? line : `${pad}${line}`))
    .join('\n');
};

/**
 * Get the character range for a YAML node. The range covers from the start
 * of the node to its end (including trailing whitespace up to the next node).
 */
const nodeRange = (node: { range?: [number, number, number] | null }): [number, number] | null => {
  if (!node.range) return null;
  return [node.range[0], node.range[2]];
};

/**
 * Find the Pair node for a given key inside a YAMLMap.
 */
const findPairInMap = (map: YAMLMap, key: string) => {
  return map.items.find((p) => isPair(p) && isScalar(p.key) && p.key.value === key) ?? null;
};

/**
 * Splice `replacement` into `yaml` at [start, end), preserving everything
 * outside that range byte-for-byte.
 */
const spliceYaml = (yaml: string, start: number, end: number, replacement: string): string => {
  return yaml.slice(0, start) + replacement + yaml.slice(end);
};

type EditScope =
  | { type: 'property'; key: string }
  | { type: 'step'; stepName: string; parentStepName?: string }
  | { type: 'insertStep'; parentStepName?: string }
  | { type: 'deleteStep'; stepName: string; parentStepName?: string };

interface StepJson {
  name?: string;
  [k: string]: unknown;
}

const findCorruptedProperty = (
  beforeJson: Record<string, unknown>,
  afterJson: Record<string, unknown>,
  skipKeys: Set<string>
): string | undefined => {
  const changed = Object.keys(beforeJson)
    .filter((key) => !skipKeys.has(key))
    .find((key) => !isEqual(beforeJson[key], afterJson[key]));
  if (changed) return changed;

  return Object.keys(afterJson)
    .filter((key) => !skipKeys.has(key))
    .find((key) => !(key in beforeJson));
};

const findCorruptedStep = (
  beforeSteps: StepJson[],
  afterSteps: StepJson[],
  excludeStepName?: string
): StepJson | undefined => {
  return beforeSteps
    .filter((s) => s.name != null && s.name !== excludeStepName)
    .find((step) => {
      const afterStep = afterSteps.find((s) => s.name === step.name);
      return !afterStep || !isEqual(step, afterStep);
    });
};

/**
 * After a splice operation, parse both before/after YAML via the AST and
 * verify that only the intended property or step changed. Returns an error
 * when unrelated sections were corrupted by the splice.
 */
const verifyEditIntegrity = (
  beforeYaml: string,
  afterYaml: string,
  editScope: EditScope
): { valid: boolean; error?: string } => {
  const beforeDoc = parseDocument(beforeYaml);
  const afterDoc = parseDocument(afterYaml);

  if (beforeDoc.errors.length > 0) {
    return { valid: false, error: 'Failed to parse original YAML for integrity check' };
  }

  if (afterDoc.errors.length > 0) {
    return {
      valid: false,
      error: `Edit integrity violation: splice produced invalid YAML: ${afterDoc.errors[0].message}`,
    };
  }

  const beforeJson = beforeDoc.toJSON() as Record<string, unknown>;
  const afterJson = afterDoc.toJSON() as Record<string, unknown>;

  const skipKeys = new Set<string>();
  if (editScope.type === 'property') {
    skipKeys.add(editScope.key);
  }

  const stepsNeedPerItemCheck = editScope.type !== 'property' || editScope.key === 'steps';
  if (stepsNeedPerItemCheck) {
    skipKeys.add('steps');
  }

  const corruptedProp = findCorruptedProperty(beforeJson, afterJson, skipKeys);
  if (corruptedProp) {
    return {
      valid: false,
      error: `Edit integrity violation: property "${corruptedProp}" was unexpectedly modified`,
    };
  }

  if (stepsNeedPerItemCheck && editScope.type !== 'property') {
    let excludeName: string | undefined;
    if (editScope.type === 'step' || editScope.type === 'deleteStep') {
      // A nested step is not in the root `steps` list, so the comparison has to
      // skip its root ancestor, which is where the change shows up.
      excludeName = editScope.parentStepName ?? editScope.stepName;
    } else if (editScope.type === 'insertStep') {
      excludeName = editScope.parentStepName;
    }
    const corruptedStep = findCorruptedStep(
      (beforeJson.steps ?? []) as StepJson[],
      (afterJson.steps ?? []) as StepJson[],
      excludeName
    );
    if (corruptedStep) {
      return {
        valid: false,
        error: `Edit integrity violation: step "${corruptedStep.name}" was unexpectedly modified`,
      };
    }
  }

  return { valid: true };
};

const checkedResult = (beforeYaml: string, afterYaml: string, editScope: EditScope): EditResult => {
  const integrity = verifyEditIntegrity(beforeYaml, afterYaml, editScope);
  if (!integrity.valid) {
    return { success: false, yaml: beforeYaml, error: integrity.error };
  }
  return { success: true, yaml: afterYaml };
};

const findRootAncestorStepName = (
  doc: Document,
  targetRange: [number, number],
  targetStepName: string
): string | undefined => {
  const rootSteps = doc.getIn(['steps']) as YAMLSeq | undefined;
  if (!isSeq(rootSteps)) return undefined;

  for (const item of rootSteps.items) {
    if (isMap(item) && item.range) {
      const [rStart, , rEnd] = item.range;
      if (targetRange[0] >= rStart && targetRange[1] <= rEnd) {
        const name = item.get('name');
        return typeof name === 'string' && name !== targetStepName ? name : undefined;
      }
    }
  }
  return undefined;
};

const formatStepYaml = (
  step: StepDefinition,
  indentUnit: number,
  seqItemIndent: number
): string => {
  const raw = stringify([step], { indent: indentUnit, lineWidth: 0 }).trimEnd();
  const pad = ' '.repeat(Math.max(0, seqItemIndent));
  return raw
    .split('\n')
    .map((line) => (line.length > 0 ? `${pad}${line}` : line))
    .join('\n');
};

const buildInsertion = (yaml: string, offset: number, stepLines: string): string => {
  const needsNewline = offset > 0 && yaml[offset - 1] !== '\n';
  return `${needsNewline ? '\n' : ''}${stepLines}\n`;
};

export const insertStep = (
  yaml: string,
  step: StepDefinition,
  insertAfterStep?: string
): EditResult => {
  const { doc, error } = parseForEditing(yaml);
  if (error) return { success: false, yaml, error };

  if (!isMap(doc.contents)) {
    return { success: false, yaml, error: 'YAML root is not a mapping' };
  }

  const indentUnit = detectIndent(yaml);

  if (insertAfterStep) {
    const targetNode = getStepNode(doc, insertAfterStep);
    if (!targetNode) {
      return { success: false, yaml, error: `Step "${insertAfterStep}" not found` };
    }
    const targetRange = nodeRange(targetNode);
    if (!targetRange) {
      return { success: false, yaml, error: 'Cannot determine target step range' };
    }

    const lastNewline = yaml.lastIndexOf('\n', targetRange[0] - 1);
    const currentIndent = lastNewline >= 0 ? targetRange[0] - lastNewline - 1 : targetRange[0];
    const stepLines = formatStepYaml(step, indentUnit, currentIndent - indentUnit);
    const insertion = buildInsertion(yaml, targetRange[1], stepLines);
    const parentStepName = findRootAncestorStepName(doc, targetRange, insertAfterStep);

    return checkedResult(yaml, spliceYaml(yaml, targetRange[1], targetRange[1], insertion), {
      type: 'insertStep',
      parentStepName,
    });
  }

  const stepsNode = doc.getIn(['steps']) as YAMLSeq | undefined;
  if (!isSeq(stepsNode) || !stepsNode.range) {
    const stepLines = formatStepYaml(step, indentUnit, indentUnit);
    const newBlock = `steps:\n${stepLines}\n`;
    const trimmed = yaml.trimEnd();
    return checkedResult(yaml, `${trimmed}\n${newBlock}`, { type: 'insertStep' });
  }

  const endOffset = stepsNode.range[2];
  const stepLines = formatStepYaml(step, indentUnit, indentUnit);
  const insertion = buildInsertion(yaml, endOffset, stepLines);
  return checkedResult(yaml, spliceYaml(yaml, endOffset, endOffset, insertion), {
    type: 'insertStep',
  });
};

export const modifyStep = (
  yaml: string,
  stepName: string,
  updatedStep: StepDefinition
): EditResult => {
  const { doc, error } = parseForEditing(yaml);
  if (error) return { success: false, yaml, error };

  const stepNode = getStepNode(doc, stepName);
  if (!stepNode) return { success: false, yaml, error: `Step "${stepName}" not found` };

  const range = nodeRange(stepNode);
  if (!range) return { success: false, yaml, error: 'Cannot determine step range' };

  const indentUnit = detectIndent(yaml);

  const lastNewline = yaml.lastIndexOf('\n', range[0] - 1);
  const currentIndent = lastNewline >= 0 ? range[0] - lastNewline - 1 : range[0];
  const depth = Math.floor(currentIndent / indentUnit);

  const stepYaml = stringifyValuePreservingFormat(updatedStep, indentUnit, depth, stepNode as Node);
  const replacement = `${stepYaml.trimEnd()}\n`;

  return checkedResult(yaml, spliceYaml(yaml, range[0], range[1], replacement), {
    type: 'step',
    stepName,
    parentStepName: findRootAncestorStepName(doc, range, stepName),
  });
};

const isIndexSegment = (segment: string): boolean => /^\d+$/.test(segment);

const isBlockValue = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && Object.keys(value).length > 0;

const isInlineScalar = (node: Node | null): node is Scalar =>
  isScalar(node) && node.type !== Scalar.BLOCK_FOLDED && node.type !== Scalar.BLOCK_LITERAL;

/** Sets `value` at `path` in a plain JS value. Missing keys are created; list indexes must exist. */
const setInPlainValue = (
  target: unknown,
  path: string[],
  value: unknown
): { value: unknown } | { error: string } => {
  if (path.length === 0) return { value };
  const [segment, ...rest] = path;

  if (Array.isArray(target)) {
    const index = Number(segment);
    if (!isIndexSegment(segment) || index >= target.length) {
      return { error: `list has ${target.length} items; index "${segment}" does not exist` };
    }
    const inner = setInPlainValue(target[index], rest, value);
    if ('error' in inner) return inner;
    return { value: target.map((item, i) => (i === index ? inner.value : item)) };
  }
  if (target == null || typeof target === 'object') {
    if (target == null && isIndexSegment(segment)) {
      return { error: `cannot create list index "${segment}"; list indexes must already exist` };
    }
    const record = (target ?? {}) as Record<string, unknown>;
    const inner = setInPlainValue(record[segment], rest, value);
    if ('error' in inner) return inner;
    return { value: { ...record, [segment]: inner.value } };
  }
  return { error: `"${segment}" is inside a scalar value` };
};

/** Indents every line after the first by `column` spaces. */
const padFollowingLines = (text: string, column: number): string =>
  text
    .split('\n')
    .map((line, i) => (i === 0 || line === '' ? line : `${' '.repeat(column)}${line}`))
    .join('\n');

const formatValue = (value: unknown, indentUnit: number, original: Node | null): string =>
  (original
    ? stringifyValuePreservingFormat(value, indentUnit, 0, original)
    : stringify(value, { indent: indentUnit, lineWidth: 0 })
  ).trimEnd();

/** `key: value`, or `key:` followed by an indented block for non-empty maps and lists. */
const formatEntry = (key: string, value: unknown, indentUnit: number, original: Node | null) => {
  const body = formatValue(value, indentUnit, original);
  return isBlockValue(value)
    ? `${key}:\n${padFollowingLines(`${' '.repeat(indentUnit)}${body}`, indentUnit)}`
    : `${key}: ${body}`;
};

const columnOf = (yaml: string, offset: number): number =>
  offset - (yaml.lastIndexOf('\n', offset - 1) + 1);

/** End of a node's content, before any trailing newlines. */
const contentEnd = (yaml: string, node: Node): number => {
  let end = node.range?.[1] ?? 0;
  while (end > 0 && yaml[end - 1] === '\n') end--;
  return end;
};

/**
 * Replaces a map entry (when `key` is set) or a list item with `value`. The new
 * text starts at the key or item token, so its column and any `- ` prefix stay.
 */
const replaceEntry = (
  yaml: string,
  key: Scalar | null,
  node: Node | null,
  value: unknown,
  indentUnit: number,
  scope: EditScope
): EditResult => {
  // Scalar to primitive: change only the value, so quoting and inline comments stay.
  if (isInlineScalar(node) && node.range && !isBlockValue(value)) {
    const valStr = formatValue(value, indentUnit, node);
    return checkedResult(yaml, spliceYaml(yaml, node.range[0], node.range[1], valStr), scope);
  }

  const start = key?.range?.[0] ?? node?.range?.[0];
  if (start === undefined) return { success: false, yaml, error: 'Cannot determine value range' };

  let end: number;
  if (node?.range) {
    end = contentEnd(yaml, node);
  } else {
    // `key:` with no value: replace up to the end of the line.
    const lineEnd = yaml.indexOf('\n', start);
    end = lineEnd === -1 ? yaml.length : lineEnd;
  }

  const text = key?.range
    ? formatEntry(yaml.slice(key.range[0], key.range[1]), value, indentUnit, node)
    : formatValue(value, indentUnit, node);
  return checkedResult(
    yaml,
    spliceYaml(yaml, start, end, padFollowingLines(text, columnOf(yaml, start))),
    scope
  );
};

/** Appends `key: value` as the last entry of the block map `map`. */
const appendEntry = (
  yaml: string,
  map: YAMLMap,
  key: string,
  value: unknown,
  indentUnit: number,
  scope: EditScope
): EditResult => {
  const mapStart = map.range?.[0];
  if (mapStart === undefined) return { success: false, yaml, error: 'Cannot determine map range' };

  const column = columnOf(yaml, mapStart);
  const entry = `${' '.repeat(column)}${padFollowingLines(
    formatEntry(key, value, indentUnit, null),
    column
  )}`;
  const end = contentEnd(yaml, map);
  return checkedResult(yaml, spliceYaml(yaml, end, end, `\n${entry}`), scope);
};

/**
 * Sets `value` at a dot path (e.g. `with.inputs.owner`, `triggers.0.with.every`)
 * under the block map `base`. Missing map keys are created. List indexes must
 * already exist.
 */
const setValueAtPath = (
  yaml: string,
  base: YAMLMap,
  path: string[],
  value: unknown,
  indentUnit: number,
  scope: EditScope
): EditResult => {
  let parent: YAMLMap | YAMLSeq = base;
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    const rest = path.slice(i + 1);
    let key: Scalar | null = null;
    let node: Node | null;

    if (isSeq(parent)) {
      const index = Number(segment);
      if (!isIndexSegment(segment) || index >= parent.items.length) {
        return {
          success: false,
          yaml,
          error: `"${path.slice(0, i).join('.')}" is a list with ${
            parent.items.length
          } items; index "${segment}" does not exist`,
        };
      }
      node = parent.items[index] as Node | null;
    } else {
      const pair = findPairInMap(parent, segment);
      if (!pair) {
        const created = setInPlainValue(undefined, rest, value);
        if ('error' in created) {
          return { success: false, yaml, error: `"${path.join('.')}": ${created.error}` };
        }
        return appendEntry(yaml, parent, segment, created.value, indentUnit, scope);
      }
      key = pair.key as Scalar;
      node = pair.value as Node | null;
    }

    if (rest.length > 0 && (isMap(node) || isSeq(node)) && !node.flow) {
      parent = node;
      continue;
    }

    // Last segment, or a value that is not a block map or list (null, scalar, flow
    // collection): build the new value in JS and rewrite the whole entry.
    const updated = setInPlainValue(node?.toJSON() ?? null, rest, value);
    if ('error' in updated) {
      return {
        success: false,
        yaml,
        error: `"${path.slice(0, i + 1).join('.')}": ${updated.error}`,
      };
    }
    return replaceEntry(yaml, key, node, updated.value, indentUnit, scope);
  }
  return { success: false, yaml, error: 'Empty property path' };
};

export const modifyStepProperty = (
  yaml: string,
  stepName: string,
  property: string,
  value: unknown
): EditResult => {
  const { doc, error } = parseForEditing(yaml);
  if (error) return { success: false, yaml, error };

  const stepNode = getStepNode(doc, stepName);
  if (!stepNode) return { success: false, yaml, error: `Step "${stepName}" not found` };

  const indentUnit = detectIndent(yaml);
  const stepNodeRange = nodeRange(stepNode);
  const scope: EditScope = {
    type: 'step',
    stepName,
    parentStepName: stepNodeRange
      ? findRootAncestorStepName(doc, stepNodeRange, stepName)
      : undefined,
  };

  return setValueAtPath(yaml, stepNode, property.split('.'), value, indentUnit, scope);
};

/**
 * Find the canonical insertion point for a new root-level property
 * based on `ROOT_PROPERTY_ORDER`. Returns the offset to splice at,
 * or null if the property isn't in the canonical list.
 */
const findCanonicalInsertOffset = (map: YAMLMap, property: string): number | null => {
  const newPropIdx = ROOT_PROPERTY_ORDER.indexOf(property);
  if (newPropIdx === -1) return null;

  let insertAfterEnd: number | null = null;
  let insertBeforeStart: number | null = null;

  for (const item of map.items) {
    if (isPair(item) && isScalar(item.key)) {
      const idx = ROOT_PROPERTY_ORDER.indexOf(item.key.value as string);
      if (idx !== -1) {
        const keyRange = item.key.range;
        const valRange = (item.value as { range?: [number, number, number] | null } | null)?.range;
        const pairEnd = valRange?.[2] ?? keyRange?.[2] ?? null;
        const pairStart = keyRange?.[0] ?? null;

        if (idx < newPropIdx && pairEnd !== null) {
          insertAfterEnd = pairEnd;
        }
        if (idx > newPropIdx && insertBeforeStart === null && pairStart !== null) {
          insertBeforeStart = pairStart;
        }
      }
    }
  }

  return insertAfterEnd ?? insertBeforeStart ?? null;
};

/** Top-level keys `modifyWorkflowProperty` can set. Steps have their own edit functions. */
export const WORKFLOW_PROPERTY_KEYS: readonly string[] = Object.keys(
  WorkflowSchema.in.shape
).filter((key) => key !== 'steps');

export const modifyWorkflowProperty = (
  yaml: string,
  property: string,
  value: unknown
): EditResult => {
  const [rootKey, ...nestedPath] = property.split('.');
  if (!WORKFLOW_PROPERTY_KEYS.includes(rootKey)) {
    return {
      success: false,
      yaml,
      error: `"${rootKey}" is not a top-level workflow key. Use one of: ${WORKFLOW_PROPERTY_KEYS.join(
        ', '
      )}. To change steps, use the step edit functions.`,
    };
  }

  const { doc, error } = parseForEditing(yaml);
  if (error) return { success: false, yaml, error };

  if (!isMap(doc.contents)) {
    return { success: false, yaml, error: 'YAML root is not a mapping' };
  }
  const indentUnit = detectIndent(yaml);
  if (findPairInMap(doc.contents, rootKey)) {
    return setValueAtPath(yaml, doc.contents, [rootKey, ...nestedPath], value, indentUnit, {
      type: 'property',
      key: rootKey,
    });
  }

  // Missing root key: add it in canonical order with the nested value.
  const created = setInPlainValue(undefined, nestedPath, value);
  if ('error' in created) return { success: false, yaml, error: `"${rootKey}": ${created.error}` };
  const scope: EditScope = { type: 'property', key: rootKey };
  const newProp = stringifyValue({ [rootKey]: created.value }, indentUnit, 0).trimEnd();
  const insertOffset = findCanonicalInsertOffset(doc.contents, rootKey);

  if (insertOffset !== null) {
    return checkedResult(yaml, spliceYaml(yaml, insertOffset, insertOffset, `${newProp}\n`), scope);
  }

  const trimmed = yaml.trimEnd();
  return checkedResult(yaml, `${trimmed}\n${newProp}\n`, scope);
};

export const deleteStep = (yaml: string, stepName: string): EditResult => {
  const { doc, error } = parseForEditing(yaml);
  if (error) return { success: false, yaml, error };

  const stepNode = getStepNode(doc, stepName);
  if (!stepNode) return { success: false, yaml, error: `Step "${stepName}" not found` };

  const range = nodeRange(stepNode);
  if (!range) return { success: false, yaml, error: 'Cannot determine step range' };

  let deleteStart = range[0];
  const before = yaml.slice(Math.max(0, deleteStart - 2), deleteStart);
  if (before.endsWith('- ')) {
    deleteStart -= 2;
  }

  const lineStart = yaml.lastIndexOf('\n', deleteStart - 1);
  if (lineStart >= 0) {
    const betweenText = yaml.slice(lineStart + 1, deleteStart);
    if (betweenText.trim() === '') {
      deleteStart = lineStart + 1;
    }
  }

  return checkedResult(yaml, spliceYaml(yaml, deleteStart, range[1], ''), {
    type: 'deleteStep',
    stepName,
    parentStepName: findRootAncestorStepName(doc, range, stepName),
  });
};

export type { StepDefinition, EditResult };
