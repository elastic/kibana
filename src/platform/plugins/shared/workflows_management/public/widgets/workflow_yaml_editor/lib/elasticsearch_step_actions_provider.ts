/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties } from 'react';
import { debounce } from 'lodash';
import { monaco } from '@kbn/monaco';
import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import type YAML from 'yaml';
import { 
  findElasticsearchStepAtPosition, 
  type ElasticsearchStepData,
  getElasticsearchSteps 
} from './elasticsearch_step_utils';
import { getMonacoRangeFromYamlNode } from './utils';

const DEBOUNCE_HIGHLIGHT_WAIT_MS = 100;


export interface ElasticsearchStepActionsProviderOptions {
  http: HttpSetup;
  notifications: NotificationsSetup;
  esHost?: string;
  kibanaHost?: string;
  getYamlDocument: () => YAML.Document | null;
}

/**
 * Provides floating action buttons for Elasticsearch steps, similar to Console
 */
export class ElasticsearchStepActionsProvider {
  private highlightedLines: monaco.editor.IEditorDecorationsCollection;
  private currentElasticsearchStep: ElasticsearchStepData | null = null;

  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    private setEditorActionsCss: (css: CSSProperties) => void,
    private options: ElasticsearchStepActionsProviderOptions
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
      decorations.push(
        // Glyph decoration
        {
          range: new monaco.Range(
            typeRange.startLineNumber,
            1,
            typeRange.startLineNumber,
            model.getLineMaxColumn(typeRange.startLineNumber)
          ),
          options: {
            glyphMarginClassName: 'elasticsearch-step-glyph',
            glyphMarginHoverMessage: {
              value: `Elasticsearch API: ${elasticsearchStep.method} ${elasticsearchStep.url}. Click for copy options.`,
            },
          },
        },
        // Type line highlighting
        {
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
        }
      );
    }

    this.highlightedLines.set(decorations);

    // Position floating action buttons
    this.positionActionButtons(stepRange);
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
      layoutInfo
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
  getCurrentElasticsearchStep(): ElasticsearchStepData | null {
    return this.currentElasticsearchStep;
  }

  /**
   * Get all Elasticsearch steps in the document
   */
  getElasticsearchSteps(): ElasticsearchStepData[] {
    const yamlDocument = this.options.getYamlDocument();
    if (!yamlDocument) {
      return [];
    }
    return getElasticsearchSteps(yamlDocument);
  }

  /**
   * Dispose of the actions provider
   */
  dispose() {
    this.highlightedLines.clear();
    this.setEditorActionsCss({ display: 'none' });
  }
}
