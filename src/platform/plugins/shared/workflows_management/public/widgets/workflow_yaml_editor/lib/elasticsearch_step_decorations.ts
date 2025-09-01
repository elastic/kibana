/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type YAML from 'yaml';
import { i18n } from '@kbn/i18n';
import { getElasticsearchSteps } from './elasticsearch_step_utils';
import { getMonacoRangeFromYamlNode } from './utils';

/**
 * Creates decorations for Elasticsearch steps in the Monaco editor
 */
export function createElasticsearchStepDecorations(
  model: monaco.editor.ITextModel,
  yamlDocument: YAML.Document
): monaco.editor.IModelDeltaDecoration[] {
  const elasticsearchSteps = getElasticsearchSteps(yamlDocument);
  
  if (elasticsearchSteps.length === 0) {
    return [];
  }

  const decorations: monaco.editor.IModelDeltaDecoration[] = [];

  elasticsearchSteps.forEach((step) => {
    // Try to get the range from the type node first, fallback to step node
    let typeRange = getMonacoRangeFromYamlNode(model, step.typeNode);

    if (!typeRange) {
      // Fallback: use the step node range and search for the type line
      const stepRange = getMonacoRangeFromYamlNode(model, step.stepNode);
      if (!stepRange) {
        return;
      }

      // Find the specific line that contains "type:" and the Elasticsearch type within this step
      let typeLineNumber = stepRange.startLineNumber;
      for (
        let lineNum = stepRange.startLineNumber;
        lineNum <= stepRange.endLineNumber;
        lineNum++
      ) {
        const lineContent = model.getLineContent(lineNum);
        if (lineContent.includes('type:') && lineContent.includes(step.type)) {
          typeLineNumber = lineNum;
          break;
        }
      }

      typeRange = {
        startLineNumber: typeLineNumber,
        endLineNumber: typeLineNumber,
        startColumn: 1,
        endColumn: model.getLineMaxColumn(typeLineNumber),
      };
    }

    // Glyph decoration (icon in the gutter)
    const glyphDecoration: monaco.editor.IModelDeltaDecoration = {
      range: new monaco.Range(
        typeRange.startLineNumber,
        1,
        typeRange.startLineNumber,
        model.getLineMaxColumn(typeRange.startLineNumber)
      ),
      options: {
        glyphMarginClassName: 'elasticsearch-step-glyph',
        glyphMarginHoverMessage: {
          value: i18n.translate(
            'workflows.workflowDetail.yamlEditor.elasticsearchStepGlyphTooltip',
            {
              defaultMessage: 
                'Elasticsearch API step: {method} {url}. Right-click or hover for copy options.',
              values: { 
                method: step.method,
                url: step.url,
              },
            }
          ),
        },
      },
    };

    // Line highlight decoration - only for the type line
    const lineHighlightDecoration: monaco.editor.IModelDeltaDecoration = {
      range: new monaco.Range(
        typeRange.startLineNumber,
        1,
        typeRange.startLineNumber,
        model.getLineMaxColumn(typeRange.startLineNumber)
      ),
      options: {
        className: 'elasticsearch-step-type-highlight',
        marginClassName: 'elasticsearch-step-type-highlight',
        isWholeLine: true,
      },
    };

    decorations.push(glyphDecoration, lineHighlightDecoration);
  });

  return decorations;
}

/**
 * Updates Elasticsearch step decorations in the editor
 */
export function updateElasticsearchStepDecorations(
  editor: monaco.editor.IStandaloneCodeEditor,
  yamlDocument: YAML.Document | null,
  decorationCollection: monaco.editor.IEditorDecorationsCollection | null
): monaco.editor.IEditorDecorationsCollection | null {
  const model = editor.getModel();
  if (!model || !yamlDocument) {
    decorationCollection?.clear();
    return null;
  }

  const decorations = createElasticsearchStepDecorations(model, yamlDocument);
  
  if (decorationCollection) {
    decorationCollection.set(decorations);
    return decorationCollection;
  } else {
    return editor.createDecorationsCollection(decorations);
  }
}
