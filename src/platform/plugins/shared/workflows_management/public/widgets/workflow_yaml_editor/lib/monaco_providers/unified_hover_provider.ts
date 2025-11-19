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

/**
 * Unified hover provider that delegates to connector-specific handlers
 * Replaces individual ES/Kibana hover providers with a single extensible system
 */
export class UnifiedHoverProvider implements monaco.languages.HoverProvider {
  private readonly getYamlDocument: () => YAML.Document | null;
  // private readonly options: Record<string, any>;

  constructor(config: ProviderConfig) {
    this.getYamlDocument = config.getYamlDocument;
    // this.options = config.options || {};
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
      // Error handling: silently fail to avoid disrupting user experience
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
        return null;
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

      // Calculate range for hover
      const range = this.calculateHoverRange(model, position, context);
      if (!range) {
        return null;
      }
      return {
        range,
        contents: [hoverContent],
      };
    } catch (error) {
      return null;
    }
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

      // Check if we're after a colon (common case: "with:|")
      const colonMatch = beforeCursor.match(/(\w+)\s*:\s*$/);
      if (colonMatch) {
        const keyName = colonMatch[1];

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
          return testPath;
        }
      }

      return [];
    } catch (error) {
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
        return null;
      }

      // Extract step information
      const stepName = (stepNode as any)?.get?.('name')?.value || `step_${stepIndex}`;
      const typeNode = (stepNode as any)?.get?.('type', true);
      const stepType = typeNode?.value;

      if (!stepType) {
        return null;
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

  /**
   * Calculate the appropriate range for the hover
   */
  private calculateHoverRange(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: HoverContext
  ): monaco.Range | null {
    try {
      // If we have a step context and are hovering over the type, use the type node range
      if (context.stepContext?.typeNode && context.yamlPath.includes('type')) {
        const typeNode = context.stepContext.typeNode;
        if (typeNode.value?.range) {
          const [startOffset, , endOffset] = typeNode.value.range;
          const startPos = model.getPositionAt(startOffset);
          const endPos = model.getPositionAt(endOffset);

          return new monaco.Range(
            startPos.lineNumber,
            startPos.column,
            endPos.lineNumber,
            endPos.column
          );
        }
      }

      // Default to word range at position
      const word = model.getWordAtPosition(position);
      if (word) {
        return new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        );
      }

      // Fallback to single character range
      return new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column + 1
      );
    } catch (error) {
      return null;
    }
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
export function registerUnifiedHoverProvider(config: ProviderConfig): monaco.IDisposable {
  const hoverProvider = createUnifiedHoverProvider(config);
  return monaco.languages.registerHoverProvider('yaml', hoverProvider);
}
