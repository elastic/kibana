/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import { monaco } from '@kbn/monaco';
import type YAML from 'yaml';
import { getCurrentPath } from '../../../../../common/lib/yaml_utils';
import { getMonacoConnectorHandler } from './provider_registry';
import type { ActionContext, ProviderConfig } from './provider_interfaces';
import { getStepRange } from '../step_detection_utils';

const DEBOUNCE_HIGHLIGHT_WAIT_MS = 100;

/**
 * Unified actions provider that provides floating action buttons for all connector types
 * Replaces individual ES/Kibana action providers with a single extensible system
 */
export class UnifiedActionsProvider {
  private readonly editor: monaco.editor.IStandaloneCodeEditor;
  private readonly getYamlDocument: () => YAML.Document | null;
  private highlightedLines: monaco.editor.IEditorDecorationsCollection;
  private currentConnectorType: string | null = null;
  private currentActionButtons: HTMLElement[] = [];
  private currentStepNode: any = null;

  constructor(editor: monaco.editor.IStandaloneCodeEditor, config: ProviderConfig) {
    this.editor = editor;
    this.getYamlDocument = config.getYamlDocument;

    // Initialize decorations collection
    this.highlightedLines = editor.createDecorationsCollection();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for position changes
   */
  private setupEventListeners(): void {
    // Debounced function to handle position changes
    const debouncedHighlight = debounce(() => {
      this.updateHighlightAndActions();
    }, DEBOUNCE_HIGHLIGHT_WAIT_MS);

    // Listen for cursor position changes
    this.editor.onDidChangeCursorPosition((e) => {
      // Always update after debounce, but don't clear immediately
      // The updateHighlightAndActions will determine if we're in a different step
      debouncedHighlight();
    });

    // Note: Removed onDidChangeModelContent listener to prevent highlighting
    // updates when typing. We only want highlighting to change when cursor moves.

    // Listen for scroll changes to update action button positions
    this.editor.onDidScrollChange(() => {
      // Update action button positions when scrolling
      if (this.currentStepNode && this.currentConnectorType) {
        this.updateActionButtonPositions();
      }
    });
  }

  /**
   * Update highlighting and action buttons based on current position
   */
  private async updateHighlightAndActions(): Promise<void> {
    try {
      const model = this.editor.getModel();
      if (!model) {
        // console.log('UnifiedActionsProvider: No model');
        return;
      }

      const yamlDocument = this.getYamlDocument();
      if (!yamlDocument) {
        // console.log('UnifiedActionsProvider: No YAML document');
        this.clearHighlightAndActions();
        return;
      }

      const position = this.editor.getPosition();
      if (!position) {
        // console.log('UnifiedActionsProvider: No position');
        this.clearHighlightAndActions();
        return;
      }

      // console.log('UnifiedActionsProvider: Checking position', position);

      // Build action context
      const context = await this.buildActionContext(model, position, yamlDocument);
      if (!context) {
        // console.log('UnifiedActionsProvider: Could not build action context');
        this.clearHighlightAndActions();
        return;
      }

      // Check if we're in a different step - only clear and re-highlight if step changed
      const newStepNode = context.stepContext?.stepNode;
      const stepChanged = this.currentStepNode !== newStepNode;

      if (stepChanged) {
        // Only clear when we move to a different step
        this.clearHighlightAndActions();

        // Update current connector type and step node
        this.currentConnectorType = context.connectorType;
        this.currentStepNode = newStepNode;

        // Update highlighting for the new step
        this.updateHighlighting(context);

        // Generate action buttons for the new step
        const handler = getMonacoConnectorHandler(context.connectorType);
        if (handler) {
          /*
          console.log(
            'UnifiedActionsProvider: Found Monaco handler for connector type:',
            context.connectorType
          );
          */
          // Generate and display action buttons
          /*
          console.log('🔍 Generating actions for context:', {
            connectorType: context.connectorType,
            stepName: context.stepContext?.stepName,
            isInWithBlock: context.stepContext?.isInWithBlock,
            yamlPath: context.yamlPath,
          });
          */
          const actions = await handler.generateActions(context);

          /*
          console.log('🔍 Generated actions:', {
            actionCount: actions.length,
            actions: actions.map((a) => ({ id: a.id, label: a.label })),
          });
          */
          this.updateActionButtons(actions, position);
        } else {
          /*
          console.log(
            'UnifiedActionsProvider: No Monaco handler found for connector type:',
            context.connectorType,
            '- showing highlighting only'
          );
          */
          // No action buttons for this step type, but still show highlighting
          this.updateActionButtons([], position);
        }
      }
      // If we're in the same step, don't regenerate actions - just update positions if needed
      else if (this.currentActionButtons.length > 0) {
        // Update action button positions for the same step (e.g., when scrolling)
        this.updateActionButtonPositions();
      }
    } catch (error) {
      // console.warn('UnifiedActionsProvider: Error updating highlight and actions', error);
      this.clearHighlightAndActions();
    }
  }

  /**
   * Build action context from current position and YAML document
   */
  private async buildActionContext(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    yamlDocument: YAML.Document
  ): Promise<ActionContext | null> {
    try {
      // Get current path in YAML
      const absolutePosition = model.getOffsetAt(position);
      let yamlPath = getCurrentPath(yamlDocument, absolutePosition);

      /*
      console.log('🔍 buildActionContext debug:', {
        absolutePosition,
        yamlPath,
        position: { line: position.lineNumber, column: position.column },
      });
      */

      // If no path found (e.g., cursor after colon), try to find it from the current line
      if (yamlPath.length === 0) {
        yamlPath = this.getPathFromCurrentLine(model, position, yamlDocument);
        // console.log('🔍 buildActionContext: Found path from current line:', yamlPath);
      }

      // Detect connector type and step context
      const stepContext = this.detectStepContext(yamlDocument, yamlPath, position);

      // console.log('🔍 buildActionContext stepContext result:', stepContext);

      if (!stepContext?.stepType) {
        // console.log('❌ buildActionContext: No stepContext or stepType, returning null');
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
        editor: this.editor,
      };
    } catch (error) {
      // console.warn('UnifiedActionsProvider: Error building context', error);
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
      /*
      console.log('🔍 getPathFromCurrentLine:', {
        lineContent: JSON.stringify(lineContent),
        beforeCursor: JSON.stringify(beforeCursor),
        position: { line: position.lineNumber, column: position.column },
      });
      */

      // Check if we're after a colon (common case: "with:|")
      const colonMatch = beforeCursor.match(/(\w+)\s*:\s*$/);
      if (colonMatch) {
        const keyName = colonMatch[1];
        // console.log('🔍 Found key after colon:', keyName);

        // Try to find this key in the document by looking at nearby positions
        // Look at the start of the key on this line
        const keyStartPosition = lineContent.indexOf(keyName);
        if (keyStartPosition !== -1) {
          const keyAbsolutePosition = model.getOffsetAt({
            lineNumber: position.lineNumber,
            column: keyStartPosition + 1,
          });

          // Try to get path from the key position
          const keyPath = getCurrentPath(yamlDocument, keyAbsolutePosition);
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
        const testPath = getCurrentPath(yamlDocument, testPosition);
        if (testPath.length > 0) {
          // console.log('🔍 Found fallback path at offset', offset, ':', testPath);
          return testPath;
        }
      }

      return [];
    } catch (error) {
      // console.warn('UnifiedActionsProvider: Error getting path from current line', error);
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
    // console.log('🔍 detectStepContext: stepsIndex:', stepsIndex, 'yamlPath:', yamlPath);

    if (stepsIndex === -1) {
      // console.log('❌ detectStepContext: No "steps" found in yamlPath');
      return null;
    }

    // Get step index
    const stepIndex = parseInt(String(yamlPath[stepsIndex + 1]), 10);
    /*
    console.log(
      '🔍 detectStepContext: stepIndex:',
      stepIndex,
      'raw value:',
      yamlPath[stepsIndex + 1]
    );
    */
    if (isNaN(stepIndex)) {
      // console.log('❌ detectStepContext: stepIndex is NaN');
      return null;
    }

    try {
      // Get step node
      const stepPath = yamlPath.slice(0, stepsIndex + 2);
      const stepNode = yamlDocument.getIn(stepPath, true);
      if (!stepNode) {
        return null;
      }

      // Extract step information
      const stepName = (stepNode as any)?.get?.('name', true)?.value || `step_${stepIndex}`;
      const typeNode = (stepNode as any)?.get?.('type', true);
      const stepType = typeNode?.value;

      if (!stepType) {
        return null;
      }

      // Check if we're in the 'with' block or its sub-blocks
      const isInWithBlock = yamlPath.some((segment) => segment === 'with');
      const isInSubBlock = yamlPath.some((segment) =>
        ['with', 'settings', 'mappings', 'aliases', 'query', 'index', 'body'].includes(
          String(segment)
        )
      );

      /*
      console.log('🔍 detectStepContext result:', {
        stepName,
        stepType,
        stepIndex,
        isInWithBlock,
        isInSubBlock,
        yamlPath,
      });
      */
      return {
        stepName,
        stepType,
        stepIndex,
        isInWithBlock: isInWithBlock || isInSubBlock, // Treat sub-blocks as "with" block
        stepNode,
        typeNode,
      };
    } catch (error) {
      // console.warn('UnifiedActionsProvider: Error detecting step context', error);
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
   * Update editor highlighting for the current step
   * Shows Dev Console-style edge highlighting when cursor is actively positioned within a step
   */
  private updateHighlighting(context: ActionContext): void {
    try {
      if (!context.stepContext?.stepNode) {
        this.highlightedLines.clear();
        return;
      }

      // Create Dev Console-style decoration (single block border)
      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      // Get step range using shared utility
      const model = this.editor.getModel();
      if (!model) return;

      const stepRange = getStepRange(context.stepContext.stepNode, model);
      if (stepRange) {
        // Create decorations for first line, middle lines, and last line
        for (
          let lineNumber = stepRange.startLineNumber;
          lineNumber <= stepRange.endLineNumber;
          lineNumber++
        ) {
          const isFirstLine = lineNumber === stepRange.startLineNumber;
          const isLastLine = lineNumber === stepRange.endLineNumber;
          const isSingleLine = stepRange.startLineNumber === stepRange.endLineNumber;

          let className = 'workflow-step-selected-middle';
          if (isSingleLine) {
            className = 'workflow-step-selected-single';
          } else if (isFirstLine) {
            className = 'workflow-step-selected-first';
          } else if (isLastLine) {
            className = 'workflow-step-selected-last';
          }

          decorations.push({
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              className,
              isWholeLine: true,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
          });
        }
      }

      // Update decorations
      this.highlightedLines.set(decorations);
      /*
      console.log('🔍 Step highlighting applied:', {
        stepName: context.stepContext.stepName,
        stepType: context.stepContext.stepType,
        lines: stepRange ? `${stepRange.startLineNumber}-${stepRange.endLineNumber}` : 'none',
      });
      */
    } catch (error) {
      // console.warn('UnifiedActionsProvider: Error updating highlighting', error);
    }
  }

  /**
   * Update floating action buttons and position them
   */
  private updateActionButtons(actions: any[], position: monaco.Position): void {
    // Clear existing buttons
    this.clearActionButtons();

    /*
    console.log(
      'UnifiedActionsProvider: Setting up action buttons:',
      actions.map((a) => a.label)
    );
    */
    // Calculate position for floating buttons - always position at first line of step
    const lineHeight = this.editor.getOption(monaco.editor.EditorOption.lineHeight);
    const scrollTop = this.editor.getScrollTop();

    // Get the step range to find the first line
    let targetLineNumber = position.lineNumber;
    try {
      const model = this.editor.getModel();
      if (model && this.currentStepNode) {
        const stepRange = getStepRange(this.currentStepNode, model);
        if (stepRange) {
          targetLineNumber = stepRange.startLineNumber;
        }
      }
    } catch (error) {
      // Fallback to current position
      // console.warn('Could not get step range, using current position');
    }

    // Position floating buttons inside the step area (like Dev Console play button)
    const topPosition = (targetLineNumber - 1) * lineHeight - scrollTop;

    this.updateEditorActionsCss({
      position: 'absolute',
      top: `${topPosition + 24}px`, // Account for border
      right: 0, // Inside the step area
      zIndex: 1, // Above the highlighting and pseudo-element
      pointerEvents: 'auto',
      display: 'flex',
      gap: '2px',
    });

    // Store actions for the React component to render
    this.currentActionButtons = actions;

    // Also register Monaco editor actions for command palette access
    actions.forEach((action, index) => {
      this.editor.addAction({
        id: `unified.${action.id}.${index}`,
        label: action.label,
        run: action.handler,
      });
    });
  }

  /**
   * Update action button positions (e.g., when scrolling)
   */
  private updateActionButtonPositions(): void {
    if (!this.currentStepNode) {
      return;
    }

    try {
      const lineHeight = this.editor.getOption(monaco.editor.EditorOption.lineHeight);
      const scrollTop = this.editor.getScrollTop();

      const model = this.editor.getModel();
      if (model) {
        const stepRange = getStepRange(this.currentStepNode, model);
        if (stepRange) {
          const targetLineNumber = stepRange.startLineNumber;
          const topPosition = (targetLineNumber - 1) * lineHeight - scrollTop;

          this.updateEditorActionsCss({
            position: 'absolute',
            top: `${topPosition + 20}px`, // Account for border and padding + 4px down
            right: '8px', // Inside the step area
            zIndex: 1, // Above the highlighting and pseudo-element
            pointerEvents: 'auto',
            display: 'flex',
            gap: '2px',
          });
        }
      }
    } catch (error) {
      // console.warn('Error updating action button positions:', error);
    }
  }

  /**
   * Update the CSS for floating action buttons
   */
  private updateEditorActionsCss(css: React.CSSProperties): void {
    // We need to communicate with the component somehow
    // For now, we'll trigger a custom event
    const event = new CustomEvent('updateEditorActionsCss', {
      detail: css,
    });
    window.dispatchEvent(event);
  }

  /**
   * Clear highlighting and action buttons
   */
  private clearHighlightAndActions(): void {
    this.highlightedLines.clear();
    this.clearActionButtons();
    this.updateEditorActionsCss({ display: 'none' }); // Hide action buttons
    this.currentConnectorType = null;
    this.currentStepNode = null;
  }

  /**
   * Get current actions for the React component to render
   */
  getCurrentActions(): any[] {
    return this.currentActionButtons || [];
  }

  /**
   * Clear action buttons
   */
  private clearActionButtons(): void {
    this.currentActionButtons = [];
  }

  /**
   * Compatibility method for ElasticsearchStepActions component
   * Returns current Elasticsearch step data if cursor is on an Elasticsearch step
   */
  getCurrentElasticsearchStep(): any {
    try {
      const model = this.editor.getModel();
      const position = this.editor.getPosition();
      if (!model || !position) {
        return null;
      }

      const yamlDocument = this.getYamlDocument();
      if (!yamlDocument) {
        return null;
      }

      // Get current path
      const absolutePosition = model.getOffsetAt(position);
      const yamlPath = getCurrentPath(yamlDocument, absolutePosition);

      // Detect step context
      const stepContext = this.detectStepContext(yamlDocument, yamlPath, position);

      if (!stepContext?.stepType) {
        return null;
      }

      // Extract Elasticsearch step data similar to old format
      const stepType = stepContext.stepType;
      const [, ...apiParts] = stepType.split('.');
      const method = this.extractHttpMethod(stepType);
      const url = this.extractApiUrl(apiParts);

      // Get step data/body
      const withNode = (stepContext.stepNode as any)?.get?.('with');
      const bodyNode = (withNode as any)?.get?.('body');
      const data = bodyNode?.value ? [JSON.stringify(bodyNode.value)] : [];

      return {
        type: stepType,
        method,
        url,
        data,
        stepNode: stepContext.stepNode,
        typeNode: stepContext.typeNode,
        name: stepContext.stepName,
      };
    } catch (error) {
      // console.warn('UnifiedActionsProvider: Error getting current Elasticsearch step', error);
      return null;
    }
  }

  /**
   * Extract HTTP method from Elasticsearch step type
   */
  private extractHttpMethod(stepType: string): string {
    // Default patterns for common Elasticsearch APIs
    if (stepType.includes('search') || stepType.includes('get') || stepType.includes('exists')) {
      return 'GET';
    }
    if (stepType.includes('create') || stepType.includes('index')) {
      return 'POST';
    }
    if (stepType.includes('update')) {
      return 'PUT';
    }
    if (stepType.includes('delete')) {
      return 'DELETE';
    }
    return 'POST'; // Default to POST
  }

  /**
   * Extract API URL from step type parts
   */
  private extractApiUrl(apiParts: string[]): string {
    if (apiParts.length === 0) {
      return '/';
    }

    // Convert step type to API path
    // Example: ['indices', 'get_mapping'] -> '/indices/_mapping'
    let path = '/' + apiParts.join('/');

    // Handle common patterns
    path = path.replace('/get_', '/_');
    path = path.replace('/create_', '/_');

    return path;
  }

  /**
   * Dispose of the provider
   */
  dispose(): void {
    this.clearHighlightAndActions();
  }
}

/**
 * Create and setup unified actions provider
 */
export function createUnifiedActionsProvider(
  editor: monaco.editor.IStandaloneCodeEditor,
  config: ProviderConfig
): UnifiedActionsProvider {
  return new UnifiedActionsProvider(editor, config);
}
