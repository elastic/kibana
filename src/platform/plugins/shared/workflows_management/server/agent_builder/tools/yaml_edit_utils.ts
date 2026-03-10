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
  condition?: string;
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

export const insertStep = (yaml: string, step: StepDefinition): EditResult => {
  const { doc, error } = parseForEditing(yaml);
  if (error) return { success: false, yaml, error };

  if (!isMap(doc.contents)) {
    return { success: false, yaml, error: 'YAML root is not a mapping' };
  }

  const indentUnit = detectIndent(yaml);
  const stepYaml = stringifyValue([step], indentUnit, 1);
  const stepLines = stepYaml.trimEnd();

  const stepsNode = doc.getIn(['steps']) as YAMLSeq | undefined;
  if (!isSeq(stepsNode) || !stepsNode.range) {
    const newBlock = `steps:\n${stepLines}\n`;
    const trimmed = yaml.trimEnd();
    return { success: true, yaml: `${trimmed}\n${newBlock}` };
  }

  const endOffset = stepsNode.range[2];
  const insertion = `${stepLines}\n`;
  return { success: true, yaml: spliceYaml(yaml, endOffset, endOffset, insertion) };
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

  return { success: true, yaml: spliceYaml(yaml, range[0], range[1], replacement) };
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

  if (pair && pair.value && (pair.value as { range?: unknown }).range) {
    const valRange = nodeRange(pair.value as { range?: [number, number, number] | null });
    if (valRange) {
      const valStr = stringifyValue(value, indentUnit, 0).trimEnd();
      return { success: true, yaml: spliceYaml(yaml, valRange[0], valRange[1], `${valStr}\n`) };
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
      return {
        success: true,
        yaml: spliceYaml(yaml, pairRange[0], pairRange[1], `${pad}${valStr}\n`),
      };
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
  const insertion = `${pad}${valStr}\n`;
  return { success: true, yaml: spliceYaml(yaml, stepRange[1], stepRange[1], insertion) };
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

  if (pair && pair.value && (pair.value as { range?: unknown }).range) {
    const valRange = nodeRange(pair.value as { range?: [number, number, number] | null });
    if (valRange) {
      const valStr = stringifyValue(value, indentUnit, 0).trimEnd();
      return { success: true, yaml: spliceYaml(yaml, valRange[0], valRange[1], `${valStr}\n`) };
    }
  }

  if (pair) {
    const pairRange = nodeRange(pair as unknown as { range?: [number, number, number] | null });
    if (pairRange) {
      const valStr = stringifyValue({ [property]: value }, indentUnit, 0).trimEnd();
      return { success: true, yaml: spliceYaml(yaml, pairRange[0], pairRange[1], `${valStr}\n`) };
    }
  }

  const newProp = stringifyValue({ [property]: value }, indentUnit, 0).trimEnd();
  const trimmed = yaml.trimEnd();
  return { success: true, yaml: `${trimmed}\n${newProp}\n` };
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

  return { success: true, yaml: spliceYaml(yaml, deleteStart, range[1], '') };
};

export type { StepDefinition, EditResult };
