/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type * as YAML from 'yaml';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { getStepNode } from '../../../../../common/lib/yaml_utils';
import { getStepRange } from '../step_detection_utils';

export interface StepExecutionProviderOptions {
  editor: monaco.editor.IStandaloneCodeEditor;
  getYamlDocument: () => YAML.Document | null;
  getStepExecutions: () => WorkflowStepExecutionDto[];
  getHighlightStep: () => string | null;
}

/**
 * Provider for managing step execution status decorations in readonly mode (Executions view)
 */
export class StepExecutionProvider {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private getYamlDocument: () => YAML.Document | null;
  private getStepExecutions: () => WorkflowStepExecutionDto[];
  private getHighlightStep: () => string | null;
  private decorationsCollection: monaco.editor.IEditorDecorationsCollection | null = null;
  private isDisposed = false;

  constructor(options: StepExecutionProviderOptions) {
    this.editor = options.editor;
    this.getYamlDocument = options.getYamlDocument;
    this.getStepExecutions = options.getStepExecutions;
    this.getHighlightStep = options.getHighlightStep;

    this.updateDecorations();

    // console.log('🎯 StepExecutionProvider: Created');
  }

  /**
   * Get adjusted range for a step node using the shared utility
   * This ensures consistency with UnifiedActionsProvider
   */
  private getAdjustedStepRange(
    model: monaco.editor.ITextModel,
    stepNode: any
  ): monaco.Range | null {
    return getStepRange(stepNode, model);
  }

  /**
   * Update execution status decorations
   */
  public updateDecorations(): void {
    if (this.isDisposed) {
      return;
    }

    try {
      const model = this.editor.getModel();
      const yamlDocument = this.getYamlDocument();
      const stepExecutions = this.getStepExecutions();
      const highlightStep = this.getHighlightStep();

      // Clear existing decorations FIRST - important for cleanup
      if (this.decorationsCollection) {
        this.decorationsCollection.clear();
        this.decorationsCollection = null;
      }

      // Only apply step execution decorations in readonly mode (Executions view)
      // This prevents interference with interactive highlighting
      if (!model || !yamlDocument) {
        /*
        console.log('🎯 StepExecutionProvider: Skipping decoration update', {
          hasModel: !!model,
          hasYamlDocument: !!yamlDocument,
          isReadOnly: this.isReadOnly(),
          stepExecutionsLength: stepExecutions?.length || 0,
        });
        */
        return;
      }

      // If no step executions, clear decorations but don't error
      if (!stepExecutions || stepExecutions.length === 0) {
        // console.log('🎯 StepExecutionProvider: No step executions to decorate');
        return;
      }

      // console.log('🎯 StepExecutionProvider: Processing', stepExecutions.length, 'step executions');

      // Validate that YAML document has the expected structure
      if (!yamlDocument.contents) {
        // console.warn('🎯 StepExecutionProvider: YAML document has no contents');
        return;
      }

      // Additional validation: ensure model content matches document
      const modelValue = model.getValue();
      if (!modelValue || modelValue.trim().length === 0) {
        // console.warn('🎯 StepExecutionProvider: Model has no content');
        return;
      }

      const decorations = stepExecutions
        .map((stepExecution, index) => {
          try {
            const stepNode = getStepNode(yamlDocument, stepExecution.stepId);
            if (!stepNode) {
              // console.warn(`❌ No stepNode found for stepId: ${stepExecution.stepId}`);
              return null;
            }

            const stepRange = this.getAdjustedStepRange(model, stepNode);
            if (!stepRange) {
              // console.warn(`❌ No stepRange found for stepNode: ${stepExecution.stepId}`);
              return null;
            }

            // Validate that range positions are valid for current model
            const lineCount = model.getLineCount();
            if (stepRange.startLineNumber < 1 || stepRange.endLineNumber > lineCount) {
              /*
              console.warn(`❌ Invalid stepRange for stepId: ${stepExecution.stepId}`, {
                stepRange: `${stepRange.startLineNumber}-${stepRange.endLineNumber}`,
                modelLineCount: lineCount,
              });
              */
              return null;
            }

            // Find the line with the YAML list marker (-) that precedes this step
            let dashLineNumber = stepRange.startLineNumber;

            // Search backwards from the step start to find the line with the dash
            for (let lineNum = stepRange.startLineNumber; lineNum >= 1; lineNum--) {
              const lineContent = model.getLineContent(lineNum);
              const trimmedContent = lineContent.trim();

              // Check if this line starts with a dash and contains relevant content
              if (
                trimmedContent.startsWith('-') &&
                (trimmedContent.includes('name:') ||
                  trimmedContent.includes(stepExecution.stepId) ||
                  lineNum === stepRange.startLineNumber - 1)
              ) {
                dashLineNumber = lineNum;
                break;
              }

              // Don't search too far back
              if (stepRange.startLineNumber - lineNum > 3) {
                break;
              }
            }

            // Glyph decoration for status icon - position at the dash line
            const glyphDecoration: monaco.editor.IModelDeltaDecoration = {
              range: new monaco.Range(
                dashLineNumber,
                1, // Start at column 1 for consistent glyph positioning
                dashLineNumber,
                1 // End at column 1 for single-point positioning
              ),
              options: {
                glyphMarginClassName: `step-execution-${stepExecution.status}-glyph ${
                  !!highlightStep && highlightStep !== stepExecution.stepId ? 'dimmed' : ''
                }`,
              },
            };

            // Background decoration for execution status - from dash line to end of step
            const bgClassName = `step-execution-${stepExecution.status} ${
              !!highlightStep && highlightStep !== stepExecution.stepId ? 'dimmed' : ''
            }`;
            const backgroundDecoration: monaco.editor.IModelDeltaDecoration = {
              range: new monaco.Range(
                dashLineNumber, // Start from the dash line
                1, // Start at column 1
                stepRange.endLineNumber,
                stepRange.endColumn
              ),
              options: {
                className: bgClassName,
                marginClassName: bgClassName,
                isWholeLine: true,
              },
            };

            return [glyphDecoration, backgroundDecoration];
          } catch (error) {
            // console.warn(`❌ Error processing stepExecution: ${stepExecution.stepId}`, error);
            return null;
          }
        })
        .flat()
        .filter((d) => d !== null) as monaco.editor.IModelDeltaDecoration[];

      this.decorationsCollection = this.editor.createDecorationsCollection(decorations);
      /*
      console.log(
        '✅ StepExecutionProvider: Applied',
        decorations.length,
        'decorations for',
        stepExecutions.length,
        'steps'
      );
      */
    } catch (error) {
      // console.error('🎯 StepExecutionProvider: Error in updateDecorations:', error);
    }
  }

  /**
   * Dispose of the provider and clean up decorations
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // console.log('🎯 StepExecutionProvider: Disposing');

    if (this.decorationsCollection) {
      this.decorationsCollection.clear();
      this.decorationsCollection = null;
    }

    this.isDisposed = true;
  }
}

/**
 * Create and register a step execution provider
 */
export function createStepExecutionProvider(
  editor: monaco.editor.IStandaloneCodeEditor,
  options: Omit<StepExecutionProviderOptions, 'editor'>
): StepExecutionProvider {
  return new StepExecutionProvider({
    editor,
    ...options,
  });
}
