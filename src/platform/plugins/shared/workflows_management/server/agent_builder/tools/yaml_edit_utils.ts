/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { Document, isMap, isPair, isScalar, isSeq, parseDocument, stringify } from 'yaml';
import type { Node, YAMLMap, YAMLSeq } from 'yaml';
import { getStepNode } from '../../../common/lib/yaml/get_step_node';
import { WORKFLOW_DEFINITION_KEYS_ORDER } from '../../../common/lib/yaml/stringify_workflow_definition';

const FIX_SPLICE_INDENTATION = true;
const ENABLE_DOT_NOTATION_PATHS = true;

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
  | { type: 'step'; stepName: string }
  | { type: 'insertStep'; parentStepName?: string }
  | { type: 'deleteStep'; stepName: string };

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
      excludeName = editScope.stepName;
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
  });
};

const resolveDotNotationProperty = (
  yaml: string,
  stepNode: YAMLMap,
  property: string,
  value: unknown,
  indentUnit: number,
  scope: EditScope
): EditResult | null => {
  const dotIdx = property.indexOf('.');
  const parentKey = property.slice(0, dotIdx);
  const childKey = property.slice(dotIdx + 1);
  const parentPair = findPairInMap(stepNode, parentKey);
  if (!parentPair || !isMap(parentPair.value)) {
    return null;
  }

  const childPair = findPairInMap(parentPair.value as YAMLMap, childKey);
  if (childPair && childPair.value && (childPair.value as { range?: unknown }).range) {
    const valRange = nodeRange(childPair.value as { range?: [number, number, number] | null });
    if (valRange) {
      const precedingNewline = yaml.lastIndexOf('\n', valRange[0] - 1);
      const valueIndent = precedingNewline >= 0 ? valRange[0] - precedingNewline - 1 : valRange[0];
      const depth = Math.floor(valueIndent / indentUnit);
      const valStr = stringifyValuePreservingFormat(
        value,
        indentUnit,
        depth,
        childPair.value as Node
      ).trimEnd();
      return checkedResult(yaml, spliceYaml(yaml, valRange[0], valRange[1], `${valStr}\n`), scope);
    }
  }

  if (!childPair) {
    const parentRange = nodeRange(
      parentPair.value as unknown as { range?: [number, number, number] | null }
    );
    if (parentRange) {
      const raw = stringify({ [childKey]: value }, { indent: indentUnit, lineWidth: 0 }).trimEnd();
      const precedingNewline = yaml.lastIndexOf('\n', parentRange[0] - 1);
      const parentIndent =
        precedingNewline >= 0 ? parentRange[0] - precedingNewline - 1 : parentRange[0];
      const childIndent = parentIndent + indentUnit;
      const pad = ' '.repeat(childIndent);
      const valStr = raw
        .split('\n')
        .map((line) => (line.length > 0 ? `${pad}${line}` : line))
        .join('\n');
      const needsNewline = parentRange[1] > 0 && yaml[parentRange[1] - 1] !== '\n';
      const insertion = `${needsNewline ? '\n' : ''}${valStr}\n`;
      return checkedResult(
        yaml,
        spliceYaml(yaml, parentRange[1], parentRange[1], insertion),
        scope
      );
    }
  }

  return null;
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
  const scope: EditScope = { type: 'step', stepName };

  if (ENABLE_DOT_NOTATION_PATHS && property.includes('.')) {
    const dotResult = resolveDotNotationProperty(
      yaml,
      stepNode,
      property,
      value,
      indentUnit,
      scope
    );
    if (dotResult) {
      return dotResult;
    }
  }

  const pair = findPairInMap(stepNode, property);

  if (pair && pair.value && (pair.value as { range?: unknown }).range) {
    const valRange = nodeRange(pair.value as { range?: [number, number, number] | null });
    if (valRange) {
      const precedingNewline = yaml.lastIndexOf('\n', valRange[0] - 1);
      const valueIndent = precedingNewline >= 0 ? valRange[0] - precedingNewline - 1 : valRange[0];
      const depth = Math.floor(valueIndent / indentUnit);
      const valStr = stringifyValuePreservingFormat(
        value,
        indentUnit,
        depth,
        pair.value as Node
      ).trimEnd();
      return checkedResult(yaml, spliceYaml(yaml, valRange[0], valRange[1], `${valStr}\n`), scope);
    }
  }

  if (pair) {
    const pairRange = nodeRange(pair as unknown as { range?: [number, number, number] | null });
    if (pairRange) {
      const leadingWs = yaml.slice(Math.max(0, pairRange[0] - 40), pairRange[0]);
      const nl = leadingWs.lastIndexOf('\n');
      const indent = nl >= 0 ? leadingWs.length - nl - 1 : 0;
      const pad = ' '.repeat(indent);
      const valStr = stringifyValue({ [property]: value }, indentUnit, 0).trimEnd();
      return checkedResult(
        yaml,
        spliceYaml(yaml, pairRange[0], pairRange[1], `${pad}${valStr}\n`),
        scope
      );
    }
  }

  const stepRange = nodeRange(stepNode);
  if (!stepRange) return { success: false, yaml, error: 'Cannot determine step range' };

  const leadingWs = yaml.slice(Math.max(0, stepRange[0] - 40), stepRange[0]);
  const nl = leadingWs.lastIndexOf('\n');
  const stepIndent = nl >= 0 ? leadingWs.length - nl - 1 : 0;

  let valStr: string;
  if (FIX_SPLICE_INDENTATION) {
    const raw = stringify({ [property]: value }, { indent: indentUnit, lineWidth: 0 }).trimEnd();
    const pad = ' '.repeat(stepIndent);
    valStr = raw
      .split('\n')
      .map((line) => (line.length > 0 ? `${pad}${line}` : line))
      .join('\n');
  } else {
    const propIndent = stepIndent + indentUnit;
    const pad = ' '.repeat(propIndent);
    valStr = `${pad}${stringifyValue({ [property]: value }, indentUnit, 0).trimEnd()}`;
  }
  const needsNewline = stepRange[1] > 0 && yaml[stepRange[1] - 1] !== '\n';
  const insertion = `${needsNewline ? '\n' : ''}${valStr}\n`;
  return checkedResult(yaml, spliceYaml(yaml, stepRange[1], stepRange[1], insertion), scope);
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

export const modifyWorkflowProperty = (
  yaml: string,
  property: string,
  value: unknown
): EditResult => {
  const { doc, error } = parseForEditing(yaml);
  if (error) return { success: false, yaml, error };

  if (!isMap(doc.contents)) {
    return { success: false, yaml, error: 'YAML root is not a mapping' };
  }

  const pair = findPairInMap(doc.contents, property);
  const indentUnit = detectIndent(yaml);
  const scope: EditScope = { type: 'property', key: property };

  if (pair && pair.value && (pair.value as { range?: unknown }).range) {
    const valRange = nodeRange(pair.value as { range?: [number, number, number] | null });
    if (valRange) {
      const leadingWs = yaml.slice(Math.max(0, valRange[0] - 40), valRange[0]);
      const nl = leadingWs.lastIndexOf('\n');
      const valueIndent = nl >= 0 ? leadingWs.length - nl - 1 : 0;
      const depth = Math.floor(valueIndent / indentUnit);
      const valStr = stringifyValuePreservingFormat(
        value,
        indentUnit,
        depth,
        pair.value as Node
      ).trimEnd();
      return checkedResult(yaml, spliceYaml(yaml, valRange[0], valRange[1], `${valStr}\n`), scope);
    }
  }

  if (pair) {
    const pairRange = nodeRange(pair as unknown as { range?: [number, number, number] | null });
    if (pairRange) {
      const valStr = stringifyValue({ [property]: value }, indentUnit, 0).trimEnd();
      return checkedResult(
        yaml,
        spliceYaml(yaml, pairRange[0], pairRange[1], `${valStr}\n`),
        scope
      );
    }
  }

  const newProp = stringifyValue({ [property]: value }, indentUnit, 0).trimEnd();
  const insertOffset = findCanonicalInsertOffset(doc.contents, property);

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
  });
};

export type { StepDefinition, EditResult };
