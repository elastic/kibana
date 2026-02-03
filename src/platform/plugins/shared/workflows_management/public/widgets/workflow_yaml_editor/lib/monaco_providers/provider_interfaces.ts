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
import type { Scalar, YAMLMap } from 'yaml';
import type { monaco } from '@kbn/monaco';
import type { ExecutionContext } from '../execution_context/build_execution_context';

/**
 * Context information for hover providers
 */
export interface HoverContext {
  /** The connector type (e.g., "elasticsearch.search", "kibana.createSpace") */
  connectorType: string;
  /** YAML path segments to the current position */
  yamlPath: string[];
  /** Current value at the cursor position */
  currentValue: any;
  /** Monaco editor position */
  position: monaco.Position;
  /** Monaco editor model */
  model: monaco.editor.ITextModel;
  /** YAML document */
  yamlDocument: YAML.Document;
  /** Step context if we're inside a workflow step */
  stepContext?: StepContext;
  /** Parameter context if we're inside a parameter */
  parameterContext?: ParameterContext | null;
}

/**
 * Context information for action providers
 */
export interface ActionContext extends HoverContext {
  /** Editor instance for actions that modify content */
  editor: monaco.editor.IStandaloneCodeEditor;
}

/**
 * Step context information
 */
export interface StepContext {
  /** Name of the step */
  stepName: string;
  /** Type of the step */
  stepType: string;
  /** Whether we're inside the 'with' block */
  isInWithBlock: boolean;
  /** YAML node for the entire step */
  stepNode: YAMLMap;
  /** YAML node for the type field */
  typeNode: Scalar<unknown>;
}

/**
 * Parameter context information
 */
export interface ParameterContext {
  /** Name of the parameter */
  parameterName: string;
  /** Expected type of the parameter */
  parameterType?: string;
  /** Whether the parameter is required */
  isRequired?: boolean;
  /** Description of the parameter */
  description?: string;
  /** Example values for the parameter */
  examples?: any[];
}

/**
 * Action information for floating action buttons
 */
export interface ActionInfo {
  /** Unique identifier for the action */
  id: string;
  /** Display label for the action */
  label: string;
  /** Icon name or component */
  icon?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Action handler function */
  handler: () => void | Promise<void>;
  /** Priority for ordering (higher = more prominent) */
  priority: number;
}

/**
 * Connector examples for autocomplete and documentation
 */
export interface ConnectorExamples {
  /** Example parameter values */
  params?: Record<string, any>;
  /** Full workflow snippet example */
  snippet?: string;
  /** Request/response examples for API connectors */
  requestResponse?: {
    request?: string;
    response?: string;
  };
}

/**
 * Base interface for Monaco connector handlers
 * These handlers provide Monaco editor extensions (hover, actions, etc.) for specific connector types
 */
export interface MonacoConnectorHandler {
  /**
   * Check if this handler can process the given connector type
   */
  canHandle(connectorType: string): boolean;

  /**
   * Generate hover content for the connector
   */
  generateHoverContent(context: HoverContext): Promise<monaco.IMarkdownString | null>;

  /**
   * Get examples for the connector type
   */
  getExamples(connectorType: string): ConnectorExamples | null;

  /**
   * Get priority for this handler (higher = more specific, handled first)
   */
  getPriority(): number;
}

/**
 * Configuration for Monaco providers
 */
export interface ProviderConfig {
  /** Function to get the current YAML document */
  getYamlDocument: () => YAML.Document | null;
  /** Function to get the current execution context (for template expression hover) */
  getExecutionContext?: () => ExecutionContext | null;
  /** Additional configuration options */
  options?: Record<string, any>;
}

/**
 * Registry for managing Monaco connector handlers
 */
export interface MonacoHandlerRegistry {
  /** Register a new Monaco connector handler */
  register(handler: MonacoConnectorHandler): void;

  /** Get the best handler for a connector type */
  getHandler(connectorType: string): MonacoConnectorHandler | null;

  /** Get all handlers that can handle a connector type */
  getHandlers(connectorType: string): MonacoConnectorHandler[];

  /** Unregister a handler */
  unregister(handler: MonacoConnectorHandler): void;

  /** Clear all handlers */
  clear(): void;
}

export interface ConnectorInfo {
  name: string;
  description: string;
  documentation?: string;
  examples?: ConnectorExamples;
}
