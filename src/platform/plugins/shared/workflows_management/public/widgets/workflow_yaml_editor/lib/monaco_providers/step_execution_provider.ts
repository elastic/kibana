/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as monaco from 'monaco-editor';
import type * as YAML from 'yaml';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { getStepNode } from '../../../../../common/lib/yaml_utils';
import { getMonacoRangeFromYamlNode } from '../utils';

export interface StepExecutionProviderOptions {
  editor: monaco.editor.IStandaloneCodeEditor;
  getYamlDocument: () => YAML.Document | null;
  getStepExecutions: () => EsWorkflowStepExecution[];
  getHighlightStep: () => string | null;
  isReadOnly: () => boolean;
}

/**
 * Provider for managing step execution status decorations in readonly mode (Executions view)
 */
export class StepExecutionProvider {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private getYamlDocument: () => YAML.Document | null;
  private getStepExecutions: () => EsWorkflowStepExecution[];
  private getHighlightStep: () => string | null;
  private isReadOnly: () => boolean;
  private decorationsCollection: monaco.editor.IEditorDecorationsCollection | null = null;
  private isDisposed = false;

  constructor(options: StepExecutionProviderOptions) {
    this.editor = options.editor;
    this.getYamlDocument = options.getYamlDocument;
    this.getStepExecutions = options.getStepExecutions;
    this.getHighlightStep = options.getHighlightStep;
    this.isReadOnly = options.isReadOnly;

    this.updateDecorations();

    console.log('🎯 StepExecutionProvider: Created');
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

      // Clear existing decorations
      if (this.decorationsCollection) {
        this.decorationsCollection.clear();
      }

      // Only apply step execution decorations in readonly mode (Executions view)
      // This prevents interference with interactive highlighting
      if (
        !model ||
        !yamlDocument ||
        !stepExecutions ||
        stepExecutions.length === 0 ||
        !this.isReadOnly()
      ) {
        return;
      }

      console.log(
        '🎯 StepExecutionProvider: Updating decorations for',
        stepExecutions.length,
        'executions'
      );

      const decorations = stepExecutions
        .map((stepExecution) => {
          const stepNode = getStepNode(yamlDocument, stepExecution.stepId);
          if (!stepNode) {
            return null;
          }
          const stepRange = getMonacoRangeFromYamlNode(model, stepNode);
          if (!stepRange) {
            return null;
          }

          // Glyph decoration for status icon
          const glyphDecoration: monaco.editor.IModelDeltaDecoration = {
            range: new monaco.Range(
              stepRange.startLineNumber,
              stepRange.startColumn,
              stepRange.startLineNumber,
              stepRange.endColumn
            ),
            options: {
              glyphMarginClassName: `step-execution-${stepExecution.status}-glyph ${
                !!highlightStep && highlightStep !== stepExecution.stepId ? 'dimmed' : ''
              }`,
            },
          };

          // Background decoration for execution status
          const bgClassName = `step-execution-${stepExecution.status} ${
            !!highlightStep && highlightStep !== stepExecution.stepId ? 'dimmed' : ''
          }`;
          const backgroundDecoration: monaco.editor.IModelDeltaDecoration = {
            range: new monaco.Range(
              stepRange.startLineNumber,
              stepRange.startColumn,
              stepRange.endLineNumber - 1,
              stepRange.endColumn
            ),
            options: {
              className: bgClassName,
              marginClassName: bgClassName,
              isWholeLine: true,
            },
          };

          return [glyphDecoration, backgroundDecoration];
        })
        .flat()
        .filter((d) => d !== null) as monaco.editor.IModelDeltaDecoration[];

      this.decorationsCollection = this.editor.createDecorationsCollection(decorations);

      console.log('🎯 StepExecutionProvider: Applied', decorations.length, 'decorations');
    } catch (error) {
      console.error('🎯 StepExecutionProvider: Error in updateDecorations:', error);
    }
  }

  /**
   * Dispose of the provider and clean up decorations
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    console.log('🎯 StepExecutionProvider: Disposing');

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
