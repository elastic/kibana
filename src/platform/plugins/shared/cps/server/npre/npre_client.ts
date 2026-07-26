/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ProjectRouting } from '@kbn/es-query';
import { errors } from '@elastic/elasticsearch';

/**
 * Represents a named project routing expression.
 */
interface NpreExpressionResponse {
  expression: ProjectRouting;
}

/**
 * Client interface for interacting with named project routing expressions.
 */
export interface INpreClient {
  /**
   * Retrieves a project routing expression by name.
   * @param expressionName the name of the expression to retrieve.
   */
  getNpre(expressionName: string): Promise<ProjectRouting | undefined>;

  /**
   * Checks if the current user has permission to retrieve named project routing expressions.
   */
  canGetNpre(): Promise<boolean>;

  /**
   * Checks if the current user has permission to create or update named project routing expressions.
   */
  canPutNpre(): Promise<boolean>;

  /**
   * Creates or updates a project routing expression.
   * @param expressionName the name of the expression.
   * @param expression the Lucene expression string.
   */
  putNpre(expressionName: string, expression: string): Promise<{ acknowledged: boolean }>;

  /**
   * Deletes a project routing expression.
   * @param expressionName the name of the expression to delete.
   */
  deleteNpre(expressionName: string): Promise<{ acknowledged: boolean }>;
}

/**
 * Service for managing project routing expressions in Elasticsearch.
 */
export class NpreClient implements INpreClient {
  constructor(private readonly logger: Logger, private readonly esClient: IScopedClusterClient) {}

  private getClient(): IScopedClusterClient {
    return this.esClient;
  }

  public async getNpre(expressionName: string): Promise<ProjectRouting | undefined> {
    this.logger.debug(`Getting NPRE for expression: ${expressionName}`);

    return this.getClient()
      .asCurrentUser.transport.request<NpreExpressionResponse>({
        method: 'GET',
        path: `/_project_routing/${expressionName}`,
      })
      .then((response) => response.expression)
      .catch((error) => {
        if (
          error instanceof errors.ResponseError &&
          error.body?.error?.type === 'resource_not_found_exception'
        ) {
          return undefined;
        }

        this.logger.error(
          `Failed to get project routing expression ${expressionName}: ${error.message}`
        );
        throw error;
      });
  }

  public async canGetNpre(): Promise<boolean> {
    return this.getClient()
      .asCurrentUser.security.hasPrivileges({
        cluster: ['cluster:monitor/project_routing/get'],
      })
      .then((response) => response.has_all_requested);
  }

  public async canPutNpre(): Promise<boolean> {
    return this.getClient()
      .asCurrentUser.security.hasPrivileges({
        cluster: ['cluster:admin/project_routing/put'],
      })
      .then((response) => response.has_all_requested);
  }

  public async putNpre(
    expressionName: string,
    expression: string
  ): Promise<{ acknowledged: boolean }> {
    this.logger.debug(`Putting NPRE for expression: ${expressionName} with value: ${expression}`);

    return this.getClient()
      .asCurrentUser.transport.request<{ acknowledged: boolean }>({
        method: 'PUT',
        path: `/_project_routing/${expressionName}`,
        body: {
          expression,
        },
      })
      .catch((error) => {
        this.logger.error(
          `Failed to put project routing expression ${expressionName}: ${error.message}`
        );
        throw error;
      });
  }

  public async deleteNpre(expressionName: string): Promise<{ acknowledged: boolean }> {
    this.logger.debug(`Deleting NPRE for expression: ${expressionName}`);

    return this.getClient()
      .asInternalUser.transport.request<{ acknowledged: boolean }>({
        method: 'DELETE',
        path: `/_project_routing/${expressionName}`,
      })
      .catch((error) => {
        this.logger.error(
          `Failed to delete project routing expression ${expressionName}: ${error.message}`
        );
        throw error;
      });
  }
}
