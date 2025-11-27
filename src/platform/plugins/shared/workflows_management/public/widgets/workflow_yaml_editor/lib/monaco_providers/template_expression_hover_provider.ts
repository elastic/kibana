/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { monaco } from '@kbn/monaco';
import type { ExecutionContext } from '../execution_context/build_execution_context';
import { evaluateExpression } from '../template_expression/evaluate_expression';
import { parseTemplateAtPosition } from '../template_expression/parse_template_at_position';
import { formatValueAsJson } from '../template_expression/resolve_path_value';

export interface TemplateExpressionHoverProviderConfig {
  /**
   * Function to get current execution context
   * Returns null when not in execution mode or no execution data available
   */
  getExecutionContext: () => ExecutionContext | null;
}

/**
 * Hover provider for template expressions {{ }}
 * Shows actual runtime values when viewing an execution
 */
export class TemplateExpressionHoverProvider implements monaco.languages.HoverProvider {
  private readonly getExecutionContext: () => ExecutionContext | null;
  private decorationCollection: monaco.editor.IEditorDecorationsCollection | null = null;
  private currentEditor: monaco.editor.IStandaloneCodeEditor | null = null;
  private lastHoverPosition: monaco.Position | null = null;

  constructor(config: TemplateExpressionHoverProviderConfig) {
    this.getExecutionContext = config.getExecutionContext;
  }

  /**
   * Set the editor instance for decoration management
   */
  public setEditor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.currentEditor = editor;
    this.decorationCollection = editor.createDecorationsCollection();

    // Clear decorations when content changes
    editor.onDidChangeModelContent(() => {
      this.clearHoverDecoration();
    });

    // Clear decorations when cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      this.clearHoverDecoration();
    });

    // Clear decorations on mouse move - but only when mouse is clearly away
    let mouseMoveTimeout: NodeJS.Timeout | null = null;
    let lastMousePosition: monaco.Position | null = null;

    editor.onMouseMove((e) => {
      const currentMousePos = e.target.position;

      // Clear any pending timeout
      if (mouseMoveTimeout) {
        clearTimeout(mouseMoveTimeout);
        mouseMoveTimeout = null;
      }

      // Store current mouse position
      lastMousePosition = currentMousePos;

      // Only set a timeout to clear if mouse is not over text content
      if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
        // Mouse is not over text (e.g., scrollbar, margin, etc.)
        //        this.clearHoverDecoration();
        this.lastHoverPosition = null;
      } else if (!currentMousePos) {
        // No position means mouse is away from content
        mouseMoveTimeout = setTimeout(() => {
          //          this.clearHoverDecoration();
          this.lastHoverPosition = null;
        }, 200);
      }
    });

    editor.onDidScrollChange(() => {
      //      this.clearHoverDecoration();
      this.lastHoverPosition = null;
    });
  }

  async provideHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): Promise<monaco.languages.Hover | null> {
    try {
      //
      // Store this position for tracking
      this.lastHoverPosition = position;

      // Get execution context - return early if not available
      const executionContext = this.getExecutionContext();
      //
      if (!executionContext) {
        //        this.clearHoverDecoration();
        this.lastHoverPosition = null;
        return null;
      }

      // Parse template expression at cursor position
      const templateInfo = parseTemplateAtPosition(model, position);
      //
      if (!templateInfo || !templateInfo.isInsideTemplate) {
        //        this.clearHoverDecoration();
        this.lastHoverPosition = null;
        return null;
      }

      //
      // Determine what to evaluate
      let value: any;
      let evaluatedPath: string;

      if (templateInfo.filters.length > 0 && templateInfo.isOnFilter) {
        // Cursor is on the filter part - evaluate with filters
        evaluatedPath = templateInfo.expression; // Show full expression in hover title

        //
        value = evaluateExpression({
          expression: templateInfo.expression,
          context: executionContext,
        });
      } else {
        // Cursor is on the variable path (not filter) - resolve path only
        evaluatedPath = templateInfo.pathUpToCursor.join('.');

        //
        value = evaluateExpression({
          expression: evaluatedPath,
          context: executionContext,
        });
      }

      //
      // If value is undefined, show a message
      if (value === undefined) {
        //        this.addHoverDecoration(templateInfo.templateRange);
        return {
          range: templateInfo.templateRange,
          contents: [
            {
              value: this.formatUndefinedMessage([evaluatedPath]),
            },
          ],
        };
      }

      // Format hover content
      const hoverContent = this.formatHoverContent([evaluatedPath], value);
      //
      // Add a visible decoration to highlight the hovered segment
      this.addHoverDecoration(templateInfo.templateRange);

      return {
        range: templateInfo.templateRange,
        contents: [hoverContent],
      };
    } catch (error) {
      //      this.clearHoverDecoration();
      return null;
    }
  }

  /**
   * Add a visible decoration to highlight the hovered segment
   */
  private addHoverDecoration(range: monaco.Range) {
    if (!this.decorationCollection) {
      return;
    }

    const decoration: monaco.editor.IModelDeltaDecoration = {
      range,
      options: {
        inlineClassName: 'template-expression-hover-inline',
      },
    };

    this.decorationCollection.set([decoration]);
  }

  /**
   * Clear hover decorations
   */
  public clearHoverDecoration() {
    this.decorationCollection?.clear();
  }

  /**
   * Format hover content with path and value
   */
  private formatHoverContent(path: string[], value: any): monaco.IMarkdownString {
    const pathStr = path.join('.');
    const jsonValue = formatValueAsJson(value, true);

    // Determine value type for display
    const valueType = this.getValueType(value);

    // Use markdown format matching BaseMonacoConnectorHandler pattern
    const content = [
      `**Value at \`${pathStr}\`** _(${valueType})_`,
      '',
      '```javascript',
      jsonValue,
      '```',
    ]
      .filter((line) => line !== null)
      .join('\n');

    return {
      value: content,
      isTrusted: true,
      supportHtml: true,
    };
  }

  /**
   * Format message for undefined values
   */
  private formatUndefinedMessage(path: string[]): string {
    const pathStr = path.join('.');
    return `**\`${pathStr}\`** is undefined in the current execution context.`;
  }

  /**
   * Get human-readable type of value
   */
  private getValueType(value: any): string {
    if (value === null) {
      return 'null';
    }

    if (Array.isArray(value)) {
      return `array[${value.length}]`;
    }

    const type = typeof value;

    if (type === 'object') {
      const keys = Object.keys(value);
      return `object{${keys.length}}`;
    }

    return type;
  }
}

/**
 * Create and return template expression hover provider
 */
export function createTemplateExpressionHoverProvider(
  config: TemplateExpressionHoverProviderConfig
): TemplateExpressionHoverProvider {
  return new TemplateExpressionHoverProvider(config);
}

/**
 * Register template expression hover provider with Monaco
 */
export function registerTemplateExpressionHoverProvider(
  config: TemplateExpressionHoverProviderConfig,
  editor?: monaco.editor.IStandaloneCodeEditor
): monaco.IDisposable {
  const hoverProvider = createTemplateExpressionHoverProvider(config);
  if (editor) {
    hoverProvider.setEditor(editor);
  }
  return monaco.languages.registerHoverProvider('yaml', hoverProvider);
}
