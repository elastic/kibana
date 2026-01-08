/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';

/**
 * Represents a project routing expression.
 */
export interface NpreExpression {
  expression: string;
}

/**
 * Client interface for interacting with project routing expressions.
 */
export interface INpreClient {
  /**
   * Retrieves a project routing expression by name.
   * @param expressionName the name of the expression to retrieve.
   */
  getNpre(expressionName: string): Promise<NpreExpression>;

  /**
   * Creates or updates a project routing expression.
   * @param expressionName the name of the expression.
   * @param expression the Lucene expression string.
   */
  putNpre(expressionName: string, expression: string): Promise<void>;

  /**
   * Deletes a project routing expression.
   * @param expressionName the name of the expression to delete.
   */
  deleteNpre(expressionName: string): Promise<void>;
}

/**
 * Service for managing project routing expressions in Elasticsearch.
 */
export class NpreClient implements INpreClient {
  constructor(
    private readonly logger: Logger,
    private readonly client: IClusterClient,
    private readonly request: KibanaRequest
  ) {}

  public async getNpre(expressionName: string): Promise<NpreExpression> {
    this.logger.info(`NpreService.getNpre() for expression: ${expressionName}`);

    try {
      const response = await this.client.asScoped(this.request).asCurrentUser.transport.request({
        method: 'GET',
        path: `/_project_routing/${encodeURIComponent(expressionName)}`,
      });

      return response as NpreExpression;
    } catch (error) {
      this.logger.error(
        `Failed to get project routing expression ${expressionName}: ${error.message}`
      );
      throw error;
    }
  }

  public async putNpre(expressionName: string, expression: string): Promise<void> {
    this.logger.info(`NpreService.putNpre() for expression: ${expressionName}`);

    try {
      await this.client.asScoped(this.request).asCurrentUser.transport.request({
        method: 'PUT',
        path: `/_project_routing/${encodeURIComponent(expressionName)}`,
        body: {
          expression,
        },
      });

      this.logger.debug(
        `Successfully created/updated project routing expression ${expressionName}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to put project routing expression ${expressionName}: ${error.message}`
      );
      throw error;
    }
  }

  public async deleteNpre(expressionName: string): Promise<void> {
    this.logger.debug(`NpreService.deleteNpre() for expression: ${expressionName}`);

    return;
    try {
      await this.client.asScoped(this.request).asCurrentUser.transport.request({
        method: 'DELETE',
        path: `/_project_routing/${encodeURIComponent(expressionName)}`,
      });

      this.logger.debug(`Successfully deleted project routing expression ${expressionName}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete project routing expression ${expressionName}: ${error.message}`
      );
      throw error;
    }
  }
}
