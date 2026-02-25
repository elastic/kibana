/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type YAML from 'yaml';
import { monaco } from '@kbn/monaco';
import type { JsonValue } from '@kbn/utility-types';
import type {
  HoverContext,
  ParameterContext,
  ProviderConfig,
  StepContext,
} from './provider_interfaces';
import { getMonacoConnectorHandler } from './provider_registry';
import { getPathAtOffset } from '../../../../../common/lib/yaml';
import { performComputation } from '../../../../entities/workflows/store/workflow_detail/utils/computation';
import { isYamlValidationMarkerOwner } from '../../../../features/validate_workflow_yaml/model/types';
import type {
  ExecutionContext,
  StepExecutionData,
} from '../execution_context/build_execution_context';
import { getInterceptedHover } from '../hover/get_intercepted_hover';
import { evaluateExpression } from '../template_expression/evaluate_expression';
import { parseTemplateAtPosition } from '../template_expression/parse_template_at_position';
import { formatValueAsJson } from '../template_expression/resolve_path_value';

export const UNIFIED_HOVER_PROVIDER_ID = 'unified-hover-provider';

/**
 * Unified hover provider that delegates to connector-specific handlers
 * Replaces individual ES/Kibana hover providers with a single extensible system
 */
export class UnifiedHoverProvider implements monaco.languages.HoverProvider {
  __providerId: string = UNIFIED_HOVER_PROVIDER_ID;

  private readonly getYamlDocument: () => YAML.Document | null;
  private readonly getExecutionContext?: () => ExecutionContext | null;
  private readonly fetchStepExecutionData?: (stepId: string) => Promise<StepExecutionData | null>;

  constructor(config: ProviderConfig) {
    this.getYamlDocument = config.getYamlDocument;
    this.getExecutionContext = config.getExecutionContext;
    this.fetchStepExecutionData = config.fetchStepExecutionData;
  }

  async provideHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    cancellationToken: monaco.CancellationToken
  ): Promise<monaco.languages.Hover | null> {
    const customHover = await this.provideCustomHover(model, position);
    if (customHover) {
      return customHover;
    }
    return getInterceptedHover(model, position, cancellationToken);
  }
  /**
   * Provide hover information for the current position
   */
  async provideCustomHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): Promise<monaco.languages.Hover | null> {
    try {
      // FIRST: Check if cursor is inside a template expression {{ }}
      // Template expression hover (runtime values) takes priority over validation
      // decorations and markers, so we check this before anything else.
      const templateInfo = parseTemplateAtPosition(model, position);
      if (templateInfo && templateInfo.isInsideTemplate) {
        return await this.handleTemplateExpressionHover(model, position, templateInfo);
      }

      // Check if there are validation errors at this position OR nearby
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

      // Check for decorations at this position, e.g. we don't want to show generic hover content over variables (valid or invalid)
      const decorations = model
        .getLineDecorations(position.lineNumber)
        .filter((decoration) => decoration.options.hoverMessage);
      if (decorations.length > 0) {
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

      // Don't return a range for connector hovers - this prevents Monaco from highlighting
      // Only template expression hovers should have ranges to show the blue highlight
      return {
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
      const stepContext = this.detectStepContext(model.getValue(), position);
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

  private detectStepContext(yamlString: string, position: monaco.Position): StepContext | null {
    const computedData = performComputation(yamlString);
    if (!computedData.workflowLookup) {
      return null;
    }

    const stepInfo = Object.values(computedData.workflowLookup.steps).find(
      (step) => step.lineStart <= position.lineNumber && position.lineNumber <= step.lineEnd
    );
    if (!stepInfo) {
      return null;
    }
    return {
      stepName: stepInfo.stepId,
      stepType: stepInfo.stepType,
      isInWithBlock: false,
      stepNode: stepInfo.stepYamlNode,
      typeNode: stepInfo.propInfos.type.valueNode,
    };
  }

  /**
   * Detect parameter context if we're inside a parameter
   */
  private detectParameterContext(
    yamlPath: (string | number)[],
    stepContext: StepContext
  ): ParameterContext | null {
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
   * Extract the step ID from a template expression path (e.g., "steps.search.output.hits" -> "search")
   */
  private extractStepIdFromPath(pathSegments: string[]): string | null {
    if (pathSegments.length >= 2 && pathSegments[0] === 'steps') {
      return pathSegments[1];
    }
    return null;
  }

  /**
   * Fetch step I/O data on demand if not already available.
   * Returns the enriched step data (merged with fetched I/O), or the existing
   * data if already present. Returns null if the step doesn't exist.
   * Deduplication is handled by the React Query cache inside fetchStepExecutionData.
   */
  private async fetchStepDataIfNeeded(
    stepData: StepExecutionData | undefined,
    stepId: string
  ): Promise<StepExecutionData | null> {
    if (!stepData) {
      return null;
    }

    if (!this.fetchStepExecutionData) {
      return stepData;
    }

    if (stepData.output !== undefined) {
      return stepData;
    }

    const fullStepData = await this.fetchStepExecutionData(stepId);
    if (fullStepData) {
      return { ...stepData, ...fullStepData };
    }
    return stepData;
  }

  /**
   * Handle hover for template expressions {{ }}
   */
  private async handleTemplateExpressionHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    templateInfo: ReturnType<typeof parseTemplateAtPosition>
  ): Promise<monaco.languages.Hover | null> {
    if (!templateInfo || !this.getExecutionContext) {
      return null;
    }

    const executionContext = this.getExecutionContext();
    if (!executionContext) {
      return null;
    }

    try {
      // Build a local context, enriching with lazily-fetched step I/O if needed
      let evalContext: ExecutionContext = executionContext;
      const stepId = this.extractStepIdFromPath(templateInfo.pathSegments);
      if (stepId) {
        const enrichedStep = await this.fetchStepDataIfNeeded(
          executionContext.steps[stepId],
          stepId
        );
        if (enrichedStep && enrichedStep !== executionContext.steps[stepId]) {
          evalContext = {
            ...executionContext,
            steps: { ...executionContext.steps, [stepId]: enrichedStep },
          };
        }
      }

      // Determine what to evaluate
      let value: JsonValue | undefined;
      let evaluatedPath: string;

      if (templateInfo.filters.length > 0 && templateInfo.isOnFilter) {
        evaluatedPath = templateInfo.expression;
        value = evaluateExpression({
          expression: templateInfo.expression,
          context: evalContext,
        });
      } else {
        evaluatedPath = templateInfo.pathUpToCursor.join('.');
        value = evaluateExpression({
          expression: evaluatedPath,
          context: evalContext,
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
          '```javascript',
          jsonValue || '(empty)',
          '```',
        ].join('\n');

        hoverContent = {
          value: content,
          isTrusted: true,
          supportHtml: true,
        };
      }

      // Return hover with range - Monaco will use editor.hoverHighlightBackground from theme
      return {
        range: templateInfo.templateRange,
        contents: [hoverContent],
      };
    } catch (error) {
      return null;
    }
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
}

/**
 * Create and register unified hover provider
 */
export function createUnifiedHoverProvider(
  config: ProviderConfig & { getExecutionContext?: () => ExecutionContext | null }
): monaco.languages.HoverProvider {
  return new UnifiedHoverProvider(config);
}

/**
 * Register unified hover provider with Monaco
 */
export function registerUnifiedHoverProvider(
  config: ProviderConfig & { getExecutionContext?: () => ExecutionContext | null }
): monaco.IDisposable {
  const hoverProvider = new UnifiedHoverProvider(config);
  return monaco.languages.registerHoverProvider('yaml', hoverProvider);
}
