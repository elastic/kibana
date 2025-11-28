/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type YAML from 'yaml';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import type { HoverContext, ProviderConfig } from './provider_interfaces';
import { getMonacoConnectorHandler } from './provider_registry';
import { getPathAtOffset } from '../../../../../common/lib/yaml';
import { isYamlValidationMarkerOwner } from '../../../../features/validate_workflow_yaml/model/types';
import type { ExecutionContext } from '../execution_context/build_execution_context';
import { evaluateExpression } from '../template_expression/evaluate_expression';
import { parseTemplateAtPosition } from '../template_expression/parse_template_at_position';
import { formatValueAsJson } from '../template_expression/resolve_path_value';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
type JsonArray = JsonValue[];

/**
 * Unified hover provider that delegates to connector-specific handlers
 * Replaces individual ES/Kibana hover providers with a single extensible system
 */
export class UnifiedHoverProvider implements monaco.languages.HoverProvider {
  private readonly getYamlDocument: () => YAML.Document | null;
  private readonly getExecutionContext?: () => ExecutionContext | null;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private decorations: string[] = [];

  constructor(config: ProviderConfig & { getExecutionContext?: () => ExecutionContext | null }) {
    this.getYamlDocument = config.getYamlDocument;
    this.getExecutionContext = config.getExecutionContext;
  }

  public setEditor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    // Clear decorations when mouse leaves
    editor.onMouseLeave(() => {
      this.clearDecorations();
    });
  }

  private clearDecorations() {
    if (this.editor && this.decorations.length > 0) {
      this.decorations = this.editor.deltaDecorations(this.decorations, []);
    }
  }

  /**
   * Setup keyboard shortcuts for Monaco actions
   * Consolidates functionality from elasticsearch_step_context_menu_provider.ts
   */
  public setupKeyboardShortcuts(editor: monaco.editor.IStandaloneCodeEditor): monaco.IDisposable[] {
    const disposables: monaco.IDisposable[] = [];

    // Add "Copy as Console" shortcut (Ctrl+K, C)
    const copyAsConsoleAction = editor.addAction({
      id: 'unified.copyAsConsole',
      label: i18n.translate('workflows.workflowDetail.yamlEditor.action.copyAsConsole', {
        defaultMessage: 'Copy step as Console format',
      }),
      keybindings: [
        // eslint-disable-next-line no-bitwise
        monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, monaco.KeyCode.KeyC),
      ],
      run: async () => {
        await this.runActionAtCurrentPosition(editor, 'copy-as-console');
      },
    });
    disposables.push(copyAsConsoleAction);

    // Add "Copy as cURL" shortcut (Ctrl+K, U)
    const copyAsCurlAction = editor.addAction({
      id: 'unified.copyAsCurl',
      label: i18n.translate('workflows.workflowDetail.yamlEditor.action.copyAsCurl', {
        defaultMessage: 'Copy step as cURL command',
      }),
      keybindings: [
        // eslint-disable-next-line no-bitwise
        monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, monaco.KeyCode.KeyU),
      ],
      run: async () => {
        await this.runActionAtCurrentPosition(editor, 'copy-as-curl');
      },
    });
    disposables.push(copyAsCurlAction);

    // Add "Copy Step" shortcut (Ctrl+K, S)
    const copyStepAction = editor.addAction({
      id: 'unified.copyStep',
      label: i18n.translate('workflows.workflowDetail.yamlEditor.action.copyStep', {
        defaultMessage: 'Copy workflow step',
      }),
      keybindings: [
        // eslint-disable-next-line no-bitwise
        monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, monaco.KeyCode.KeyS),
      ],
      run: async () => {
        await this.runActionAtCurrentPosition(editor, 'copy-step');
      },
    });
    disposables.push(copyStepAction);

    return disposables;
  }

  /**
   * Run a specific action at the current cursor position
   */
  private async runActionAtCurrentPosition(
    editor: monaco.editor.IStandaloneCodeEditor,
    actionId: string
  ): Promise<void> {
    try {
      const model = editor.getModel();
      const position = editor.getPosition();

      if (!model || !position) {
        return;
      }

      const yamlDocument = this.getYamlDocument();
      if (!yamlDocument) {
        return;
      }

      // Build context
      const context = await this.buildActionContext(model, position, yamlDocument, editor);
      if (!context) {
        return;
      }

      // Find handler
      const handler = getMonacoConnectorHandler(context.connectorType);
      if (!handler) {
        return;
      }

      // Get actions and find the requested one
      const actions = await handler.generateActions(context);
      const action = actions.find((a) => a.id === actionId);

      if (action) {
        await action.handler();
      }
    } catch (error) {
      // console.warn('UnifiedHoverProvider: Error running action', error);
    }
  }

  /**
   * Build action context (similar to hover context but includes editor)
   */
  private async buildActionContext(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    yamlDocument: YAML.Document,
    editor: monaco.editor.IStandaloneCodeEditor
  ): Promise<any> {
    const hoverContext = await this.buildHoverContext(model, position, yamlDocument);
    if (!hoverContext) {
      return null;
    }

    return {
      ...hoverContext,
      editor,
    };
  }

  /**
   * Provide hover information for the current position
   */
  async provideHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): Promise<monaco.languages.Hover | null> {
    try {
      //
      // FIRST: Check if there are validation errors at this position OR nearby
      // If there are, let the validation-only hover provider handle it
      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      const validationMarkersNearby = markers.filter(
        (marker) =>
          marker.startLineNumber === position.lineNumber && // Same line
          isYamlValidationMarkerOwner(marker.owner) && // Only check YAML validation errors
          // Check if the position is within or very close to the marker range
          ((marker.startColumn <= position.column && marker.endColumn >= position.column) ||
            Math.abs(marker.startColumn - position.column) <= 3 || // Within 3 columns
            Math.abs(marker.endColumn - position.column) <= 3)
      );

      if (validationMarkersNearby.length > 0) {
        //        //        return null;
      }

      // Second: check for decorations at this position, e.g. we don't want to show generic hover content over variables (valid or invalid)
      const decorations = model
        .getLineDecorations(position.lineNumber)
        .filter((decoration) => decoration.options.hoverMessage);
      if (decorations.length > 0) {
        return null;
      }

      // Third: Check if cursor is inside a template expression {{ }}
      const templateInfo = parseTemplateAtPosition(model, position);
      if (templateInfo && templateInfo.isInsideTemplate) {
        // Handle template expression hover (only if execution context is available)
        return this.handleTemplateExpressionHover(model, position, templateInfo);
      }

      // Get YAML document
      const yamlDocument = this.getYamlDocument();
      if (!yamlDocument) {
        return null;
      }

      // Detect context at current position
      const context = await this.buildHoverContext(model, position, yamlDocument);
      if (!context) {
        return null;
      }

      // Only show connector hover for specific fields (type, or connector parameters)
      // Don't show hover for arbitrary string values in the YAML
      if (!this.shouldShowConnectorHover(context)) {
        return null;
      }

      // Find appropriate Monaco handler
      const handler = getMonacoConnectorHandler(context.connectorType);
      if (!handler) {
        return null;
      }

      // Generate hover content
      const hoverContent = await handler.generateHoverContent(context);
      if (!hoverContent) {
        return null;
      }

      // Return hover without range - we only want highlighting for template expressions
      return {
        contents: [hoverContent],
      };
    } catch (error) {
      // console.warn('UnifiedHoverProvider: Error providing hover', error);
      return null;
    }
  }

  /**
   * Handle hover for template expressions {{ }}
   */
  private handleTemplateExpressionHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    templateInfo: ReturnType<typeof parseTemplateAtPosition>
  ): monaco.languages.Hover | null {
    if (!templateInfo || !this.getExecutionContext) {
      return null;
    }

    const executionContext = this.getExecutionContext();
    if (!executionContext) {
      return null;
    }

    try {
      // Determine what to evaluate
      let value: JsonValue | undefined;
      let evaluatedPath: string;

      if (templateInfo.filters.length > 0 && templateInfo.isOnFilter) {
        // Cursor is on the filter part - evaluate with filters
        evaluatedPath = templateInfo.expression;
        value = evaluateExpression({
          expression: templateInfo.expression,
          context: executionContext,
        });
      } else {
        // Cursor is on the variable path (not filter) - resolve path only
        evaluatedPath = templateInfo.pathUpToCursor.join('.');
        value = evaluateExpression({
          expression: evaluatedPath,
          context: executionContext,
        });
      }

      // Format hover content
      let hoverContent: monaco.IMarkdownString;
      if (value === undefined) {
        hoverContent = {
          value: `**\`${evaluatedPath}\`** is undefined in the current execution context.`,
        };
      } else {
        const jsonValue = formatValueAsJson(value, true);
        const valueType = this.getValueType(value);
        const content = [
          `**Value at \`${evaluatedPath}\`** _(${valueType})_`,
          '',
          '```json',
          jsonValue || '(empty)', // Ensure there's always some content
          '```',
        ].join('\n');

        hoverContent = {
          value: content,
          isTrusted: true,
          supportHtml: true,
        };
      }

      // Add custom decoration for template expressions
      if (this.editor) {
        this.decorations = this.editor.deltaDecorations(this.decorations, [
          {
            range: templateInfo.templateRange,
            options: {
              className: 'template-expression-hover-highlight',
            },
          },
        ]);
      }

      return {
        range: templateInfo.templateRange,
        contents: [hoverContent],
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Determine if we should show connector hover for this context
   * Only show for the 'type' field or relevant parameter fields
   */
  private shouldShowConnectorHover(context: HoverContext): boolean {
    const yamlPath = context.yamlPath;

    // Always show hover when hovering on the 'type' field itself
    if (yamlPath.includes('type')) {
      return true;
    }

    // Show hover if we're in a parameter context (e.g., hovering on a parameter name or its value)
    // But only if we have parameter metadata from the connector
    if (context.parameterContext) {
      return true;
    }

    // For everything else (like random string values in the document), don't show connector hover
    return false;
  }

  /**
   * Get human-readable type of value
   */
  private getValueType(value: JsonValue): string {
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

  /**
   * Build hover context from current position and YAML document
   */
  private async buildHoverContext(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    yamlDocument: YAML.Document
  ): Promise<HoverContext | null> {
    try {
      // Get current path in YAML
      const absolutePosition = model.getOffsetAt(position);
      let yamlPath = getPathAtOffset(yamlDocument, absolutePosition);

      // If no path found (e.g., cursor after colon), try to find it from the current line
      if (yamlPath.length === 0) {
        yamlPath = this.getPathFromCurrentLine(model, position, yamlDocument);
      }

      // Detect connector type and step context
      const stepContext = this.detectStepContext(yamlDocument, yamlPath, position);
      if (!stepContext?.stepType) {
        return null;
      }

      // Detect parameter context if we're in a parameter
      const parameterContext = this.detectParameterContext(yamlPath, stepContext);

      // Get current value at position
      const currentValue = yamlDocument.getIn(yamlPath, true);

      return {
        connectorType: stepContext.stepType,
        yamlPath: yamlPath.map((segment) => String(segment)),
        currentValue,
        position,
        model,
        yamlDocument,
        stepContext,
        parameterContext,
      };
    } catch (error) {
      // console.warn('UnifiedHoverProvider: Error building context', error);
      return null;
    }
  }

  /**
   * Get YAML path from current line when cursor is in ambiguous position (e.g., after colon)
   */
  private getPathFromCurrentLine(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    yamlDocument: YAML.Document
  ): (string | number)[] {
    try {
      const lineContent = model.getLineContent(position.lineNumber);
      const beforeCursor = lineContent.substring(0, position.column - 1);

      //
      // Check if we're after a colon (common case: "with:|")
      const colonMatch = beforeCursor.match(/(\w+)\s*:\s*$/);
      if (colonMatch) {
        const keyName = colonMatch[1];
        //
        // Try to find this key in the document by looking at nearby positions
        // Look at the start of the key on this line
        const keyStartPosition = lineContent.indexOf(keyName);
        if (keyStartPosition !== -1) {
          const keyAbsolutePosition = model.getOffsetAt({
            lineNumber: position.lineNumber,
            column: keyStartPosition + 1,
          });

          // Try to get path from the key position
          const keyPath = getPathAtOffset(yamlDocument, keyAbsolutePosition);
          if (keyPath.length > 0) {
            // Add the key name to the path
            return [...keyPath, keyName];
          }
        }
      }

      // Fallback: try to find path from the beginning of the current line
      const lineStartPosition = model.getOffsetAt({
        lineNumber: position.lineNumber,
        column: 1,
      });

      // Try positions along the line to find any valid path
      for (let offset = 0; offset < lineContent.length; offset++) {
        const testPosition = lineStartPosition + offset;
        const testPath = getPathAtOffset(yamlDocument, testPosition);
        if (testPath.length > 0) {
          //          return testPath;
        }
      }

      return [];
    } catch (error) {
      // console.warn('UnifiedHoverProvider: Error getting path from current line', error);
      return [];
    }
  }

  /**
   * Detect step context from YAML path and document
   */
  private detectStepContext(
    yamlDocument: YAML.Document,
    yamlPath: (string | number)[],
    position: monaco.Position
  ): any {
    // Look for steps in the path
    const stepsIndex = yamlPath.findIndex((segment) => segment === 'steps');
    if (stepsIndex === -1) {
      return null;
    }

    // Get step index
    const stepIndex = parseInt(String(yamlPath[stepsIndex + 1]), 10);
    if (isNaN(stepIndex)) {
      return null;
    }

    try {
      // Get step node - handle being inside 'with' block
      let stepPath = yamlPath.slice(0, stepsIndex + 2);

      // If we're deeper in the path (e.g., in 'with' block), still get the step node
      if (yamlPath.length > stepsIndex + 2) {
        stepPath = yamlPath.slice(0, stepsIndex + 2);
      }

      const stepNode = yamlDocument.getIn(stepPath, true);
      if (!stepNode) {
        //        return null;
      }

      // Extract step information
      const stepName = (stepNode as any)?.get?.('name')?.value || `step_${stepIndex}`;
      const typeNode = (stepNode as any)?.get?.('type', true);
      const stepType = typeNode?.value;

      //
      if (!stepType) {
        //        return null;
      }

      // Check if we're in the 'with' block
      const isInWithBlock = yamlPath.some((segment) => segment === 'with');

      return {
        stepName,
        stepType,
        stepIndex,
        isInWithBlock,
        stepNode,
        typeNode,
      };
    } catch (error) {
      // console.warn('UnifiedHoverProvider: Error detecting step context', error);
      return null;
    }
  }

  /**
   * Detect parameter context if we're inside a parameter
   */
  private detectParameterContext(yamlPath: (string | number)[], stepContext: any): any {
    if (!stepContext?.isInWithBlock) {
      return null;
    }

    // Find 'with' in path and get parameter name
    const withIndex = yamlPath.findIndex((segment) => segment === 'with');
    if (withIndex === -1 || withIndex >= yamlPath.length - 1) {
      return null;
    }

    const parameterName = yamlPath[withIndex + 1];
    if (!parameterName || typeof parameterName !== 'string') {
      return null;
    }

    return {
      parameterName,
      parameterType: 'any', // Could be enhanced with schema information
      isRequired: false, // Could be enhanced with schema information
    };
  }
}

/**
 * Create and register unified hover provider
 */
export function createUnifiedHoverProvider(config: ProviderConfig): monaco.languages.HoverProvider {
  return new UnifiedHoverProvider(config);
}

/**
 * Register unified hover provider with Monaco
 */
export function registerUnifiedHoverProvider(
  config: ProviderConfig & { getExecutionContext?: () => ExecutionContext | null },
  editor?: monaco.editor.IStandaloneCodeEditor
): monaco.IDisposable {
  const hoverProvider = new UnifiedHoverProvider(config);
  if (editor) {
    hoverProvider.setEditor(editor);
  }
  return monaco.languages.registerHoverProvider('yaml', hoverProvider);
}
