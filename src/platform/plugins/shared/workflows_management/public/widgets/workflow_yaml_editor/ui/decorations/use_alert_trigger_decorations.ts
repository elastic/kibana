/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { useEffect, useRef } from 'react';
import type { Document, Node } from 'yaml';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { getTriggerNodes } from '../../../../../common/lib/yaml';
import { getMonacoRangeFromYamlNode } from '../../lib/utils';

interface UseAlertTriggerDecorationsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  yamlDocument: Document | null;
  isEditorMounted: boolean;
  readOnly: boolean;
}

export const useAlertTriggerDecorations = ({
  editor,
  yamlDocument,
  isEditorMounted,
  readOnly,
}: UseAlertTriggerDecorationsProps) => {
  const alertTriggerDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  useEffect(() => {
    const model = editor?.getModel() ?? null;
    if (alertTriggerDecorationCollectionRef.current) {
      // clear existing decorations
      alertTriggerDecorationCollectionRef.current.clear();
    }

    // Don't show alert dots when in executions view or when prerequisites aren't met
    if (!model || !yamlDocument || !isEditorMounted || readOnly || !editor) {
      return;
    }

    const triggerNodes = getTriggerNodes(yamlDocument);
    const alertTriggers = triggerNodes.filter(({ triggerType }) => triggerType === 'alert');

    if (alertTriggers.length === 0) {
      return;
    }

    const decorations = alertTriggers
      .map(({ node, typePair }) => {
        // Try to get the range from the typePair first, fallback to searching within the trigger node
        let typeRange = getMonacoRangeFromYamlNode(model, typePair.value as Node);

        if (!typeRange) {
          // Fallback: use the trigger node range and search for the type line
          const triggerRange = getMonacoRangeFromYamlNode(model, node);
          if (!triggerRange) {
            return null;
          }

          // Find the specific line that contains "type:" and "alert" within this trigger
          let typeLineNumber = triggerRange.startLineNumber;
          for (
            let lineNum = triggerRange.startLineNumber;
            lineNum <= triggerRange.endLineNumber;
            lineNum++
          ) {
            const lineContent = model.getLineContent(lineNum);
            if (lineContent.includes('type:') && lineContent.includes('alert')) {
              typeLineNumber = lineNum;
              break;
            }
          }

          typeRange = new monaco.Range(
            typeLineNumber,
            1,
            typeLineNumber,
            model.getLineMaxColumn(typeLineNumber)
          );
        }

        const glyphDecoration: monaco.editor.IModelDeltaDecoration = {
          range: new monaco.Range(
            typeRange!.startLineNumber,
            1,
            typeRange!.startLineNumber,
            model.getLineMaxColumn(typeRange!.startLineNumber)
          ),
          options: {
            glyphMarginClassName: 'alert-trigger-glyph',
            glyphMarginHoverMessage: {
              value: i18n.translate(
                'workflows.workflowDetail.yamlEditor.alertTriggerGlyphTooltip',
                {
                  defaultMessage:
                    'Alert trigger: This workflow will be executed automatically only when connected to a rule via the "Run Workflow" action.',
                }
              ),
            },
          },
        };

        const lineHighlightDecoration: monaco.editor.IModelDeltaDecoration = {
          range: new monaco.Range(
            typeRange!.startLineNumber,
            1,
            typeRange!.startLineNumber,
            model.getLineMaxColumn(typeRange!.startLineNumber)
          ),
          options: {
            // className: 'alert-trigger-highlight',
            // marginClassName: 'alert-trigger-highlight',
            // isWholeLine: true,
            after: {
              content: 'Connect this workflow to a rule via the "Run Workflow" action.',
              inlineClassName: 'after-text',
            },
          },
        };

        return [glyphDecoration, lineHighlightDecoration];
      })
      .flat()
      .filter((d) => d !== null) as monaco.editor.IModelDeltaDecoration[];

    // Ensure we have a valid editor reference before creating decorations
    if (decorations.length > 0 && editor) {
      // Small delay to ensure Monaco editor is fully ready for decorations
      // This addresses race conditions where the editor is mounted but not fully initialized
      const createDecorations = () => {
        if (editor) {
          alertTriggerDecorationCollectionRef.current =
            editor.createDecorationsCollection(decorations);
        }
      };

      // Try immediately, and if that fails, try again with a small delay
      try {
        createDecorations();
      } catch (error) {
        setTimeout(createDecorations, 10);
      }
    }
  }, [isEditorMounted, yamlDocument, readOnly, editor]);

  // Return ref for cleanup purposes
  return {
    decorationCollectionRef: alertTriggerDecorationCollectionRef,
  };
};
