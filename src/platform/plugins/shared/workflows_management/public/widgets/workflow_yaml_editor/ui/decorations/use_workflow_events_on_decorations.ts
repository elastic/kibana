/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import type { Document, LineCounter, Node, Pair, Scalar, YAMLMap } from 'yaml';
import { isScalar } from 'yaml';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { getTriggerNodes, getTriggerOnChainOptionPairs } from '../../../../../common/lib/yaml';
import { getMonacoRangeFromYamlNode } from '../../lib/utils';

/**
 * `Pair` nodes often have no `range`; key/value scalars do. Prefer the same `LineCounter` used when
 * parsing the document (matches validation). Fall back to Monaco offsets, then scanning the trigger block.
 */
function resolveChainOptionPropertyLine(
  model: monaco.editor.ITextModel,
  triggerNode: YAMLMap,
  pair: Pair<Scalar, Scalar>,
  yamlLineCounter: LineCounter | undefined
): number | null {
  if (yamlLineCounter && isScalar(pair.key) && pair.key.range) {
    const startOffset = pair.key.range[0];
    const pos = yamlLineCounter.linePos(startOffset);
    if (typeof pos.line === 'number' && pos.line >= 1) {
      return pos.line;
    }
  }

  const pairRange = getMonacoRangeFromYamlNode(model, pair as unknown as Node);
  if (pairRange) {
    return pairRange.startLineNumber;
  }

  if (isScalar(pair.key)) {
    const keyRange = getMonacoRangeFromYamlNode(model, pair.key as unknown as Node);
    if (keyRange) {
      return keyRange.startLineNumber;
    }
  }

  const propertyKey = typeof pair.key.value === 'string' ? pair.key.value : '';
  if (propertyKey === '') {
    return null;
  }

  const triggerRange = getMonacoRangeFromYamlNode(model, triggerNode as unknown as Node);
  if (!triggerRange) {
    return null;
  }

  const needle = `${propertyKey}:`;
  for (let line = triggerRange.startLineNumber; line <= triggerRange.endLineNumber; line++) {
    if (model.getLineContent(line).includes(needle)) {
      return line;
    }
  }

  return null;
}

interface UseWorkflowEventsOnDecorationsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  yamlDocument: Document | null;
  /** Same counter as `parseDocument(..., { lineCounter })` in workflow computation; aligns glyphs with markers. */
  yamlLineCounter: LineCounter | undefined;
  isEditorMounted: boolean;
  readOnly: boolean;
}

function glyphHoverForWorkflowEvents(mode: string): { value: string } {
  if (mode === 'ignore') {
    return {
      value: i18n.translate(
        'workflows.workflowDetail.yamlEditor.workflowEventsIgnoreGlyphTooltip',
        {
          defaultMessage:
            'workflowEvents: ignore — this workflow is not scheduled when the trigger event was emitted from another workflow run. User- or domain-originated events still run it.',
        }
      ),
    };
  }
  if (mode === 'allow-all') {
    return {
      value: i18n.translate(
        'workflows.workflowDetail.yamlEditor.workflowEventsAllowAllGlyphTooltip',
        {
          defaultMessage:
            'workflowEvents: allow-all — this workflow may run on workflow-emitted events without the event-chain cycle guard. Max event chain depth still applies; use only when intentional.',
        }
      ),
    };
  }
  return {
    value: i18n.translate(
      'workflows.workflowDetail.yamlEditor.workflowEventsAvoidLoopGlyphTooltip',
      {
        defaultMessage:
          'workflowEvents: avoid-loop — run on workflow-emitted events but skip scheduling if this workflow is already on the event chain (loop guard). Omitted defaults to avoid-loop.',
      }
    ),
  };
}

export const useWorkflowEventsOnDecorations = ({
  editor,
  yamlDocument,
  yamlLineCounter,
  isEditorMounted,
  readOnly,
}: UseWorkflowEventsOnDecorationsProps) => {
  const decorationCollectionRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  useEffect(() => {
    let retryTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const model = editor?.getModel() ?? null;
    if (decorationCollectionRef.current) {
      decorationCollectionRef.current.clear();
    }

    if (model && yamlDocument && isEditorMounted && !readOnly && editor) {
      const triggerNodes = getTriggerNodes(yamlDocument);
      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      for (const { node } of triggerNodes) {
        const pairs = getTriggerOnChainOptionPairs(node);

        for (const pair of pairs) {
          const lineNumber = resolveChainOptionPropertyLine(model, node, pair, yamlLineCounter);
          if (lineNumber !== null) {
            const mode =
              isScalar(pair.value) && typeof pair.value.value === 'string'
                ? pair.value.value
                : 'avoid-loop';

            decorations.push({
              range: new monaco.Range(
                lineNumber,
                1,
                lineNumber,
                model.getLineMaxColumn(lineNumber)
              ),
              options: {
                glyphMarginClassName: 'workflow-trigger-on-chain-glyph',
                glyphMarginHoverMessage: glyphHoverForWorkflowEvents(mode),
              },
            });
          }
        }
      }

      if (decorations.length > 0 && editor) {
        const createDecorations = () => {
          if (editor) {
            decorationCollectionRef.current = editor.createDecorationsCollection(decorations);
          }
        };

        try {
          createDecorations();
        } catch {
          retryTimeoutId = setTimeout(createDecorations, 10);
        }
      }
    }

    return () => {
      if (retryTimeoutId !== undefined) {
        clearTimeout(retryTimeoutId);
      }
    };
  }, [isEditorMounted, yamlDocument, yamlLineCounter, readOnly, editor]);

  return { decorationCollectionRef };
};
