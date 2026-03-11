/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type Document,
  isMap,
  isPair,
  isScalar,
  isSeq,
  parseDocument,
  stringify,
  type YAMLMap,
  type YAMLSeq,
} from 'yaml';
import { parseYamlToJSONWithoutValidation } from '../../../common/lib/yaml';

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

const ROOT_PROPERTY_ORDER = [
  'version',
  'name',
  'description',
  'enabled',
  'tags',
  'consts',
  'triggers',
  'inputs',
  'steps',
];

const parseForEditing = (yaml: string): { doc: Document; error?: string } => {
  const { document } = parseYamlToJSONWithoutValidation(yaml);

  if (document.errors.length > 0) {
    return { doc: document, error: `YAML parse errors: ${document.errors[0].message}` };
  }

  const doc = parseDocument(yaml);
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

const findStepNode = (doc: Document, stepName: string): { node: YAMLMap; index: number } | null => {
  const stepsNode = doc.getIn(['steps']) as YAMLSeq | undefined;
  if (!isSeq(stepsNode)) return null;

  for (let i = 0; i < stepsNode.items.length; i++) {
    const item = stepsNode.items[i];
    if (isMap(item)) {
      const nameVal = item.get('name');
      if (nameVal === stepName) return { node: item, index: i };
    }
  }
  return null;
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
  | { type: 'insertStep' }
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
  return Object.keys(beforeJson)
    .filter((key) => !skipKeys.has(key))
    .find((key) => JSON.stringify(beforeJson[key]) !== JSON.stringify(afterJson[key]));
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
      return !afterStep || JSON.stringify(step) !== JSON.stringify(afterStep);
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
    const excludeName =
      editScope.type === 'step' || editScope.type === 'deleteStep' ? editScope.stepName : undefined;
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

export const insertStep = (yaml: string, step: StepDefinition): EditResult => {
  const { doc, error } = parseForEditing(yaml);
  if (error) return { success: false, yaml, error };

  if (!isMap(doc.contents)) {
    return { success: false, yaml, error: 'YAML root is not a mapping' };
  }

  const indentUnit = detectIndent(yaml);
  const rawStepYaml = stringify([step], { indent: indentUnit, lineWidth: 0 }).trimEnd();
  const stepLines = rawStepYaml
    .split('\n')
    .map((line) => (line.length > 0 ? ' '.repeat(indentUnit) + line : line))
    .join('\n');

  const stepsNode = doc.getIn(['steps']) as YAMLSeq | undefined;
  if (!isSeq(stepsNode) || !stepsNode.range) {
    const newBlock = `steps:\n${stepLines}\n`;
    const trimmed = yaml.trimEnd();
    return checkedResult(yaml, `${trimmed}\n${newBlock}`, { type: 'insertStep' });
  }

  const endOffset = stepsNode.range[2];
  const needsNewline = endOffset > 0 && yaml[endOffset - 1] !== '\n';
  const insertion = `${needsNewline ? '\n' : ''}${stepLines}\n`;
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

  const found = findStepNode(doc, stepName);
  if (!found) return { success: false, yaml, error: `Step "${stepName}" not found` };

  const range = nodeRange(found.node);
  if (!range) return { success: false, yaml, error: 'Cannot determine step range' };

  const indentUnit = detectIndent(yaml);

  const leadingWhitespace = yaml.slice(range[0] - 20 > 0 ? range[0] - 20 : 0, range[0]);
  const lastNewline = leadingWhitespace.lastIndexOf('\n');
  const currentIndent = lastNewline >= 0 ? leadingWhitespace.length - lastNewline - 1 : range[0];
  const depth = Math.round(currentIndent / indentUnit);

  const stepYaml = stringifyValue(updatedStep, indentUnit, depth);
  const replacement = `${stepYaml.trimEnd()}\n`;

  return checkedResult(yaml, spliceYaml(yaml, range[0], range[1], replacement), {
    type: 'step',
    stepName,
  });
};

export const modifyStepProperty = (
  yaml: string,
  stepName: string,
  property: string,
  value: unknown
): EditResult => {
  const { doc, error } = parseForEditing(yaml);
  if (error) return { success: false, yaml, error };

  const found = findStepNode(doc, stepName);
  if (!found) return { success: false, yaml, error: `Step "${stepName}" not found` };

  const pair = findPairInMap(found.node, property);
  const indentUnit = detectIndent(yaml);

  const scope: EditScope = { type: 'step', stepName };

  if (pair && pair.value && (pair.value as { range?: unknown }).range) {
    const valRange = nodeRange(pair.value as { range?: [number, number, number] | null });
    if (valRange) {
      const valStr = stringifyValue(value, indentUnit, 0).trimEnd();
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

  const stepRange = nodeRange(found.node);
  if (!stepRange) return { success: false, yaml, error: 'Cannot determine step range' };

  const leadingWs = yaml.slice(Math.max(0, stepRange[0] - 40), stepRange[0]);
  const nl = leadingWs.lastIndexOf('\n');
  const stepIndent = nl >= 0 ? leadingWs.length - nl - 1 : 0;
  const propIndent = stepIndent + indentUnit;
  const pad = ' '.repeat(propIndent);
  const valStr = stringifyValue({ [property]: value }, indentUnit, 0).trimEnd();
  const needsNewline = stepRange[1] > 0 && yaml[stepRange[1] - 1] !== '\n';
  const insertion = `${needsNewline ? '\n' : ''}${pad}${valStr}\n`;
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
      const depth = Math.round(valueIndent / indentUnit);
      const valStr = stringifyValue(value, indentUnit, depth).trimEnd();
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

  const found = findStepNode(doc, stepName);
  if (!found) return { success: false, yaml, error: `Step "${stepName}" not found` };

  const range = nodeRange(found.node);
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
