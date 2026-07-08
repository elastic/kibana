/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPair, isScalar } from 'yaml';
import type { Document, Pair, Scalar, YAMLMap } from 'yaml';
import { monaco } from '@kbn/monaco';
import { getStepNodesWithType, getTriggerNodesWithType } from '@kbn/workflows-yaml';
import { getBaseConnectorType } from '../../../components/step_icons';

/** Base class Monaco adds to the `type:` value span; the icon CSS keys off it. */
export const INLINE_HIGHLIGHT_CLASS = 'type-inline-highlight';

const sanitize = (value: string): string => value.replaceAll('.', '-');

/** CSS class suffix for a step type. Aggregated by base connector type so e.g. `slack.postMessage` and `slack.reply` share one icon. */
export const getStepTypeCssClass = (type: string): string =>
  `type-${sanitize(getBaseConnectorType(type))}`;

/** CSS class suffix for a trigger type. */
export const getTriggerTypeCssClass = (type: string): string => `type-${sanitize(type)}`;

/** A `type` value found in the workflow body, with the CSS class its inline decoration carries. */
export interface UsedType {
  type: string;
  kind: 'step' | 'trigger';
  cssClass: string;
}

export interface TypeDecorations {
  decorations: monaco.editor.IModelDeltaDecoration[];
  usedTypes: UsedType[];
}

function extractTypeScalar(node: YAMLMap): Scalar | undefined {
  const typePair = node.items.find(
    (item): item is Pair<Scalar, Scalar> =>
      isPair(item) && isScalar(item.key) && item.key.value === 'type'
  );
  return typePair && isScalar(typePair.value) ? typePair.value : undefined;
}

function buildInlineDecoration(
  model: monaco.editor.ITextModel,
  typeText: string,
  range: readonly [number, number, number],
  cssClass: string
): monaco.editor.IModelDeltaDecoration {
  const startPosition = model.getPositionAt(range[1]);
  const endPosition = model.getPositionAt(range[2]);

  // The scalar range can include quotes / trailing tokens; locate the literal
  // type text on the line so the decoration wraps exactly the value.
  let targetLineNumber = startPosition.lineNumber;
  let typeIndex = model.getLineContent(targetLineNumber).indexOf(typeText);
  if (typeIndex === -1 && endPosition.lineNumber !== startPosition.lineNumber) {
    targetLineNumber = endPosition.lineNumber;
    typeIndex = model.getLineContent(targetLineNumber).indexOf(typeText);
  }

  const startColumn = typeIndex !== -1 ? typeIndex + 1 : startPosition.column;
  const endColumn = typeIndex !== -1 ? typeIndex + typeText.length + 1 : endPosition.column;

  return {
    range: {
      startLineNumber: targetLineNumber,
      startColumn,
      endLineNumber: targetLineNumber,
      endColumn,
    },
    options: {
      inlineClassName: `${INLINE_HIGHLIGHT_CLASS} ${cssClass}`,
      stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
    },
  };
}

function collectDecorations(
  model: monaco.editor.ITextModel,
  nodes: YAMLMap[],
  kind: 'step' | 'trigger',
  toCssClass: (type: string) => string,
  decorations: monaco.editor.IModelDeltaDecoration[],
  usedTypes: UsedType[],
  isTypeAllowed?: (type: string) => boolean
): void {
  for (const node of nodes) {
    const valueScalar = extractTypeScalar(node);
    const typeText = valueScalar?.value;
    const range = valueScalar?.range;
    const isRenderable =
      typeof typeText === 'string' &&
      (typeText.length >= 3 || typeText === 'if') &&
      range != null &&
      range.length >= 3 &&
      (isTypeAllowed === undefined || isTypeAllowed(typeText));

    if (isRenderable) {
      const cssClass = toCssClass(typeText);
      decorations.push(
        buildInlineDecoration(model, typeText, range as [number, number, number], cssClass)
      );
      usedTypes.push({ type: typeText, kind, cssClass });
    }
  }
}

export interface ComputeTypeDecorationsOptions {
  /**
   * Gate for trigger `type` decorations. The YAML walk matches any `type:`
   * under a `triggers` node, which includes a trigger's `inputs[].type`; this
   * predicate keeps only real trigger types (built-in or registered), matching
   * the workflow editor's behavior.
   */
  isTriggerTypeAllowed?: (type: string) => boolean;
}

/**
 * Compute the inline `type:` decorations for a workflow YAML document plus the
 * distinct step/trigger types they reference (so the caller can resolve icons).
 */
export function computeTypeDecorations(
  model: monaco.editor.ITextModel,
  doc: Document,
  { isTriggerTypeAllowed }: ComputeTypeDecorationsOptions = {}
): TypeDecorations {
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  const usedTypes: UsedType[] = [];

  if (doc?.contents) {
    collectDecorations(
      model,
      getStepNodesWithType(doc),
      'step',
      getStepTypeCssClass,
      decorations,
      usedTypes
    );
    collectDecorations(
      model,
      getTriggerNodesWithType(doc),
      'trigger',
      getTriggerTypeCssClass,
      decorations,
      usedTypes,
      isTriggerTypeAllowed
    );
  }

  return { decorations, usedTypes };
}
