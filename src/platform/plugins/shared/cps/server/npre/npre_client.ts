/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { CoreStart, IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { ProjectRouting } from '@kbn/es-query';
import { getDetailedErrorMessage } from '@kbn/interactive-setup-plugin/server/errors';
import type { AcknowledgeResponse } from '@kbn/core-saved-objects-migration-server-internal/src/actions';
import { errors } from '@elastic/elasticsearch';

/**
 * Represents a project routing expression.
 */
interface NpreExpressionResponse {
  expression: ProjectRouting;
}

/**
 * Client interface for interacting with project routing expressions.
 */
export interface INpreClient {
  canGetNpre(): Promise<boolean>;

  /**
   * Retrieves a project routing expression by name.
   * @param expressionName the name of the expression to retrieve.
   */
  getNpre(expressionName: string): Promise<ProjectRouting>;

  canPutNpre(): Promise<boolean>;

  /**
   * Creates or updates a project routing expression.
   * @param expressionName the name of the expression.
   * @param expression the Lucene expression string.
   */
  putNpre(expressionName: string, expression: ProjectRouting): Promise<AcknowledgeResponse>;

  canDeleteNpre(): Promise<boolean>;

  /**
   * Deletes a project routing expression.
   * @param expressionName the name of the expression to delete.
   */
  deleteNpre(expressionName: string): Promise<AcknowledgeResponse>;
}

/**
 * Service for managing project routing expressions in Elasticsearch.
 */
export class NpreClient implements INpreClient {
  constructor(
    private readonly logger: Logger,
    private readonly core: CoreStart,
    private readonly request: KibanaRequest
  ) {}

  private getClient(): IClusterClient {
    return this.core.elasticsearch.client;
  }

  public async canGetNpre(): Promise<boolean> {
    return this.getClient()
      .asScoped(this.request)
      .asCurrentUser.security.hasPrivileges({
        cluster: ['monitor'],
      })
      .then((response) => response.has_all_requested);
  }

  public async getNpre(expressionName: string): Promise<ProjectRouting> {
    this.logger.debug(`Getting NPRE for expression: ${expressionName}`);

    return this.getClient()
      .asScoped(this.request)
      .asCurrentUser.transport.request<NpreExpressionResponse>({
        method: 'GET',
        path: `/_project_routing/${encodeURIComponent(expressionName)}`,
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
          `Failed to get project routing expression ${expressionName}: ${getDetailedErrorMessage(
            error.message
          )}`
        );
        throw error;
      });
  }

  private async canWriteNpre(): Promise<boolean> {
    return this.getClient()
      .asScoped(this.request)
      .asCurrentUser.security.hasPrivileges({
        cluster: ['manage'],
      })
      .then((response) => response.has_all_requested);
  }

  public async canPutNpre(): Promise<boolean> {
    return this.canWriteNpre();
  }

  public async putNpre(expressionName: string, expression: string): Promise<AcknowledgeResponse> {
    this.logger.debug(`Putting NPRE for expression: ${expressionName} with value: ${expression}`);

    return this.getClient()
      .asScoped(this.request)
      .asCurrentUser.transport.request<AcknowledgeResponse>({
        method: 'PUT',
        path: `/_project_routing/${encodeURIComponent(expressionName)}`,
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

  public async canDeleteNpre(): Promise<boolean> {
    return this.canWriteNpre();
  }

  public async deleteNpre(expressionName: string): Promise<AcknowledgeResponse> {
    this.logger.debug(`Deleting NPRE for expression: ${expressionName}`);

    return this.getClient()
      .asScoped(this.request)
      .asCurrentUser.transport.request<AcknowledgeResponse>({
        method: 'DELETE',
        path: `/_project_routing/${encodeURIComponent(expressionName)}`,
      })
      .catch((error) => {
        this.logger.error(
          `Failed to delete project routing expression ${expressionName}: ${error.message}`
        );
        throw error;
      });
  }
}
