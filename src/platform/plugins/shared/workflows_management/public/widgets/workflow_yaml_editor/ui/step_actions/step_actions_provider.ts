/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable no-console */

import type { CSSProperties } from 'react';
import { debounce } from 'lodash';
import { monaco } from '@kbn/monaco';
import { isPair, isScalar, visit, isMap } from 'yaml';
import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import type YAML from 'yaml';
import { getMonacoRangeFromYamlNode } from '../../lib/utils';

const DEBOUNCE_HIGHLIGHT_WAIT_MS = 100;

export interface StepData {
  name: string;
  type: string;
  stepNode: any;
  typeNode: any;
}

export function isStep(stepType: string | undefined | null): boolean {
  return typeof stepType === 'string'; // && stepType.startsWith('elasticsearch');
}

export function getSteps(yamlDocument: YAML.Document): StepData[] {
  const steps: StepData[] = [];

  if (!yamlDocument?.contents) {
    console.log('getSteps: No document contents');
    return steps;
  }

  console.log('getSteps: Starting YAML visit');

  visit(yamlDocument, {
    Pair(key, pair, ancestors) {
      if (!pair.key || !isScalar(pair.key) || pair.key.value !== 'type') {
        return;
      }

      console.log('getSteps: Found type pair', pair.value);

      // Check if this is a type field within a step
      const path = ancestors.slice();
      let isStepType = false;

      // Walk up the ancestors to see if we're in a steps array
      for (let i = path.length - 1; i >= 0; i--) {
        const ancestor = path[i];
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'steps') {
          isStepType = true;
          break;
        }
      }

      console.log('getSteps: isStepType', isStepType);

      if (isStepType && isScalar(pair.value)) {
        const stepType = pair.value.value as string;
        console.log('getSteps: Found step type', stepType);

        if (isStep(stepType)) {
          console.log('getSteps: Is Elasticsearch step', stepType);
          // Find the parent step node that contains this type
          const stepNode = ancestors[ancestors.length - 1];

          // Extract 'with' parameters from the step
          let withParams: Record<string, any> = {};
          if (stepNode && isMap(stepNode)) {
            for (const item of stepNode.items) {
              if (isPair(item) && isScalar(item.key) && item.key.value === 'with') {
                if (item.value && isMap(item.value)) {
                  withParams = {};
                  for (const withItem of item.value.items) {
                    if (isPair(withItem) && isScalar(withItem.key)) {
                      const _key = withItem.key.value as string;
                      // Handle both scalar values and nested objects
                      if (isScalar(withItem.value)) {
                        withParams[_key] = withItem.value.value;
                      } else {
                        // For nested objects (like query), convert the YAML node to a JS object
                        withParams[_key] = (withItem.value as any)?.toJSON?.() || withItem.value;
                      }
                    }
                  }
                }
                break;
              }
            }
          }

          steps.push({
            name: (stepNode as any).get('name'),
            type: stepType,
            stepNode,
            typeNode: pair,
          });
        }
      }
    },
  });

  console.log('getSteps: Found', steps.length, 'elasticsearch steps');
  return steps;
}

export function findElasticsearchStepAtPosition(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  yamlDocument: YAML.Document
): StepData | null {
  const elasticsearchSteps = getSteps(yamlDocument);

  console.log(
    'findElasticsearchStepAtPosition: Found',
    elasticsearchSteps.length,
    'elasticsearch steps'
  );

  const offset = model.getOffsetAt(position);
  console.log('findElasticsearchStepAtPosition: Position offset', offset);

  for (const step of elasticsearchSteps) {
    // Check if the position is within the step node range
    const stepRange = step.stepNode.range;
    console.log('findElasticsearchStepAtPosition: Checking step', step.type, 'range', stepRange);
    if (stepRange && offset >= stepRange[0] && offset <= stepRange[1]) {
      console.log('findElasticsearchStepAtPosition: Found matching step', step);
      return step;
    }
  }

  console.log('findElasticsearchStepAtPosition: No matching step found');
  return null;
}

export interface StepActionsProviderOptions {
  http: HttpSetup;
  notifications: NotificationsSetup;
  esHost?: string;
  kibanaHost?: string;
  getYamlDocument: () => YAML.Document | null;
}

/**
 * Provides floating action buttons for Elasticsearch steps, similar to Console
 */
export class StepActionsProvider {
  private highlightedLines: monaco.editor.IEditorDecorationsCollection;
  private currentElasticsearchStep: StepData | null = null;

  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    private setEditorActionsCss: (css: CSSProperties) => void,
    private options: StepActionsProviderOptions
  ) {
    this.highlightedLines = this.editor.createDecorationsCollection();

    const debouncedHighlightRequests = debounce(
      async () => {
        if (this.editor.hasTextFocus()) {
          await this.highlightElasticsearchSteps();
        } else {
          this.clearEditorDecorations();
        }
      },
      DEBOUNCE_HIGHLIGHT_WAIT_MS,
      {
        leading: true,
      }
    );

    // Initialize listeners
    this.editor.onDidChangeCursorPosition(async () => {
      await debouncedHighlightRequests();
    });

    this.editor.onDidScrollChange(async () => {
      await debouncedHighlightRequests();
    });

    this.editor.onDidChangeCursorSelection(async () => {
      await debouncedHighlightRequests();
    });

    this.editor.onDidContentSizeChange(async () => {
      await debouncedHighlightRequests();
    });

    this.editor.onDidBlurEditorText(() => {
      // Delay clearing to allow button clicks
      setTimeout(() => {
        this.clearEditorDecorations();
      }, 200);
    });
  }

  private clearEditorDecorations() {
    this.highlightedLines.clear();
    this.currentElasticsearchStep = null;
    this.setEditorActionsCss({ display: 'none' });
  }

  private async highlightElasticsearchSteps() {
    const model = this.editor.getModel();
    if (!model) {
      console.log('ElasticsearchStepActionsProvider: No model');
      return;
    }

    const yamlDocument = this.options.getYamlDocument();
    if (!yamlDocument) {
      console.log('ElasticsearchStepActionsProvider: No YAML document');
      return;
    }

    const position = this.editor.getPosition();
    if (!position) {
      console.log('ElasticsearchStepActionsProvider: No position');
      return;
    }

    console.log('ElasticsearchStepActionsProvider: Checking position', position);

    // Find Elasticsearch step at current position
    const elasticsearchStep = findElasticsearchStepAtPosition(model, position, yamlDocument);

    if (!elasticsearchStep) {
      console.log('ElasticsearchStepActionsProvider: No Elasticsearch step found at position');
      this.clearEditorDecorations();
      return;
    }

    console.log('ElasticsearchStepActionsProvider: Found Elasticsearch step', elasticsearchStep);

    // Update current step
    this.currentElasticsearchStep = elasticsearchStep;

    // Create block decorations for the entire step
    const stepRange = getMonacoRangeFromYamlNode(model, elasticsearchStep.stepNode);
    if (!stepRange) {
      console.log('ElasticsearchStepActionsProvider: No step range found');
      return;
    }

    console.log('ElasticsearchStepActionsProvider: Step range', stepRange);

    // Find the type line for glyph decoration
    const typeRange = getMonacoRangeFromYamlNode(model, elasticsearchStep.typeNode);

    const decorations: monaco.editor.IModelDeltaDecoration[] = [
      // Block highlighting for the entire step - each line individually for full-line coverage
    ];

    // Add full-line highlighting for each line in the step range
    for (let lineNum = stepRange.startLineNumber; lineNum <= stepRange.endLineNumber; lineNum++) {
      decorations.push({
        range: new monaco.Range(lineNum, 1, lineNum, model.getLineMaxColumn(lineNum)),
        options: {
          className: 'elasticsearch-step-block-highlight',
          isWholeLine: true,
        },
      });
    }

    // Add glyph and type line highlighting if we have the type range
    if (typeRange) {
      //   decorations.push(
      //     // Glyph decoration
      //     {
      //       range: new monaco.Range(
      //         typeRange.startLineNumber,
      //         1,
      //         typeRange.startLineNumber,
      //         model.getLineMaxColumn(typeRange.startLineNumber)
      //       ),
      //       options: {
      //         glyphMarginClassName: 'elasticsearch-step-glyph',
      //         glyphMarginHoverMessage: {
      //           value: `Elasticsearch API: ${elasticsearchStep.method} ${elasticsearchStep.url}. Click for copy options.`,
      //         },
      //       },
      //     },
      //     // Type line highlighting
      //     {
      //       range: new monaco.Range(
      //         typeRange.startLineNumber,
      //         1,
      //         typeRange.startLineNumber,
      //         model.getLineMaxColumn(typeRange.startLineNumber)
      //       ),
      //       options: {
      //         className: 'elasticsearch-step-type-highlight',
      //         marginClassName: 'elasticsearch-step-type-highlight',
      //         isWholeLine: true,
      //       },
      //     }
      //   );
    }

    this.highlightedLines.set(decorations);

    // Position floating action buttons
    this.positionActionButtons(stepRange as monaco.Range);
  }

  private positionActionButtons(range: monaco.Range) {
    const editorElement = this.editor.getDomNode();
    if (!editorElement) {
      console.log('ElasticsearchStepActionsProvider: No editor element');
      return;
    }

    // Get the position of the range in screen coordinates
    const lineTop = this.editor.getTopForLineNumber(range.startLineNumber);
    const lineHeight = this.editor.getOption(monaco.editor.EditorOption.lineHeight);
    const scrollTop = this.editor.getScrollTop();

    // Calculate position relative to editor
    const top = lineTop - scrollTop + lineHeight / 2;

    // Get the right edge of the editor content area
    const layoutInfo = this.editor.getLayoutInfo();
    const left = layoutInfo.contentLeft + layoutInfo.contentWidth - 50; // 50px for single button width

    console.log('ElasticsearchStepActionsProvider: Positioning buttons', {
      lineTop,
      lineHeight,
      scrollTop,
      top,
      left,
      layoutInfo,
    });

    // Set the CSS to position the action buttons
    this.setEditorActionsCss({
      position: 'absolute',
      top: `${top}px`,
      left: `${left}px`,
      display: 'flex',
      zIndex: 1000,
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '4px',
      border: '1px solid #d3dae6',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      padding: '2px',
    });
  }

  /**
   * Get the current Elasticsearch step (for use by action buttons)
   */
  getCurrentElasticsearchStep(): StepData | null {
    return this.currentElasticsearchStep;
  }

  /**
   * Get all Elasticsearch steps in the document
   */
  getSteps(): StepData[] {
    const yamlDocument = this.options.getYamlDocument();
    if (!yamlDocument) {
      return [];
    }
    return getSteps(yamlDocument);
  }

  /**
   * Dispose of the actions provider
   */
  dispose() {
    this.highlightedLines.clear();
    this.setEditorActionsCss({ display: 'none' });
  }
}
