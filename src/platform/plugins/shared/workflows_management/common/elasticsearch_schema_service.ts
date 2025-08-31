/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { ConnectorContract } from '@kbn/workflows';
import { z } from '@kbn/zod';

// Console definition types based on the JSON structure
interface ConsoleUrlParams {
  [key: string]: string | string[] | '__flag__';
}

interface ConsoleDefinition {
  url_params?: ConsoleUrlParams;
  methods?: string[];
  patterns?: string[];
  documentation?: string;
  priority?: number;
  availability?: {
    stack?: boolean;
    serverless?: boolean;
  };
}

interface EndpointDefinition {
  [endpointName: string]: ConsoleDefinition;
}

export class ElasticsearchSchemaService {
  private consoleDefinitionsPath: string;
  private logger?: (message: string) => void;

  constructor(consoleDefinitionsPath?: string, logger?: (message: string) => void) {
    // Default to Console's generated definitions folder
    // Try multiple possible paths since the relative path depends on build context
    this.consoleDefinitionsPath = consoleDefinitionsPath || this.findConsoleDefinitionsPath();
    this.logger = logger;
  }

  private findConsoleDefinitionsPath(): string {
    const possiblePaths = [
      // Development environment
      join(__dirname, '../../console/server/lib/spec_definitions/json/generated'),
      // Built environment
      join(__dirname, '../../../console/server/lib/spec_definitions/json/generated'),
      // Alternative paths
      join(
        process.cwd(),
        'src/platform/plugins/shared/console/server/lib/spec_definitions/json/generated'
      ),
    ];

    for (const path of possiblePaths) {
      try {
        if (existsSync(path)) {
          this.log(`Found Console definitions at: ${path}`);
          return path;
        }
      } catch (error) {
        // Continue trying other paths
      }
    }

    // Fallback - this will cause a graceful failure with fallback connectors
    this.log('Warning: Could not find Console definitions path, will use fallback');
    return join(__dirname, '../../console/server/lib/spec_definitions/json/generated');
  }

  /**
   * Generate ConnectorContract[] from Console's Elasticsearch API definitions
   */
  public generateElasticsearchConnectors(): ConnectorContract[] {
    try {
      const consoleDefinitions = this.loadConsoleDefinitions();
      const connectors = this.convertToConnectorContracts(consoleDefinitions);

      this.log(`Generated ${connectors.length} Elasticsearch connectors from Console definitions`);
      return connectors;
    } catch (error) {
      this.log(`Error generating Elasticsearch connectors: ${error}`);
      return [];
    }
  }

  /**
   * Load all Console definition files from the generated folder
   */
  private loadConsoleDefinitions(): Record<string, ConsoleDefinition> {
    const definitions: Record<string, ConsoleDefinition> = {};

    try {
      const files = readdirSync(this.consoleDefinitionsPath).filter((file) =>
        file.endsWith('.json')
      );

      this.log(`Loading ${files.length} Console definition files`);

      for (const file of files) {
        try {
          const filePath = join(this.consoleDefinitionsPath, file);
          const content = readFileSync(filePath, 'utf8');
          const endpointDefinition: EndpointDefinition = JSON.parse(content);

          // Merge endpoint definitions into our main collection
          Object.assign(definitions, endpointDefinition);
        } catch (error) {
          this.log(`Warning: Failed to load definition file ${file}: ${error}`);
        }
      }

      this.log(`Successfully loaded ${Object.keys(definitions).length} API definitions`);
      return definitions;
    } catch (error) {
      this.log(`Error loading Console definitions from ${this.consoleDefinitionsPath}: ${error}`);
      return {};
    }
  }

  /**
   * Convert Console definitions to ConnectorContract format
   */
  private convertToConnectorContracts(
    definitions: Record<string, ConsoleDefinition>
  ): ConnectorContract[] {
    const connectors: ConnectorContract[] = [];

    for (const [endpointName, definition] of Object.entries(definitions)) {
      try {
        const connector = this.convertSingleDefinition(endpointName, definition);
        connectors.push(connector);
      } catch (error) {
        this.log(`Warning: Failed to convert ${endpointName}: ${error}`);
      }
    }

    return connectors;
  }

  /**
   * Convert a single Console definition to ConnectorContract
   */
  private convertSingleDefinition(
    endpointName: string,
    definition: ConsoleDefinition
  ): ConnectorContract {
    const type = `elasticsearch.${endpointName}`;

    // Convert url_params to Zod schema
    const paramsSchema = this.createParamsSchema(
      definition.url_params || {},
      definition.patterns || []
    );

    // Create basic output schema (all ES responses are complex, so use z.any() for now)
    const outputSchema = z.any().describe(`Response from ${endpointName} API`);

    return {
      type,
      connectorIdRequired: false, // ES APIs don't require connector IDs
      paramsSchema,
      outputSchema,
    };
  }

  /**
   * Create Zod schema from Console url_params and patterns
   */
  private createParamsSchema(urlParams: ConsoleUrlParams, patterns: string[]): z.ZodType {
    const schemaObject: Record<string, z.ZodType> = {};

    // Add parameters from URL patterns (like {index}, {id})
    const pathParams = this.extractPathParameters(patterns);
    for (const param of pathParams) {
      schemaObject[param] = z.string().optional().describe(`Path parameter: ${param}`);
    }

    // Convert url_params to Zod types
    for (const [paramName, paramValue] of Object.entries(urlParams)) {
      try {
        schemaObject[paramName] = this.convertUrlParamToZod(paramName, paramValue);
      } catch (error) {
        this.log(`Warning: Failed to convert parameter ${paramName}, using z.any(): ${error}`);
        schemaObject[paramName] = z.any().optional();
      }
    }

    // Add common body parameter for APIs that accept request body
    schemaObject.body = z.any().optional().describe('Request body');

    return z.object(schemaObject);
  }

  /**
   * Extract path parameters from Console patterns
   * e.g., ["{index}/_search", "/_search"] -> ["index"]
   */
  private extractPathParameters(patterns: string[]): string[] {
    const params = new Set<string>();

    for (const pattern of patterns) {
      const matches = pattern.match(/\{([^}]+)\}/g);
      if (matches) {
        for (const match of matches) {
          const param = match.slice(1, -1); // Remove { }
          params.add(param);
        }
      }
    }

    return Array.from(params);
  }

  /**
   * Convert Console url_param value to appropriate Zod schema
   */
  private convertUrlParamToZod(
    paramName: string,
    paramValue: string | string[] | '__flag__'
  ): z.ZodType {
    // Handle boolean flags
    if (paramValue === '__flag__') {
      return z.boolean().optional().describe(`Boolean flag: ${paramName}`);
    }

    // Handle string arrays (enum-like values)
    if (Array.isArray(paramValue)) {
      if (paramValue.length === 0) {
        return z.array(z.string()).optional().describe(`Array parameter: ${paramName}`);
      }

      // Check if all values are numeric
      if (paramValue.every((val) => !isNaN(Number(val)))) {
        return z
          .union([z.number(), z.array(z.number()), z.enum(paramValue as [string, ...string[]])])
          .optional()
          .describe(`Numeric parameter: ${paramName}`);
      }

      // String enum
      return z
        .enum(paramValue as [string, ...string[]])
        .optional()
        .describe(`Enum parameter: ${paramName}`);
    }

    // Handle single string values
    if (typeof paramValue === 'string') {
      // Check if it's a numeric default
      if (!isNaN(Number(paramValue))) {
        return z.union([z.string(), z.number()]).optional().describe(`Parameter: ${paramName}`);
      }

      return z.string().optional().describe(`String parameter: ${paramName}`);
    }

    // Fallback for unknown types
    this.log(`Warning: Unknown parameter type for ${paramName}, using z.any()`);
    return z.any().optional();
  }

  private log(message: string): void {
    if (this.logger) {
      this.logger(`[ElasticsearchSchemaService] ${message}`);
    }
  }
}
