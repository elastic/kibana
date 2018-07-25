/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { SavedObjectsErrors } from './saved_objects_errors';
import { SavedObjectsRepository } from './saved_objects_repository';

export class SavedObjectsClient {
  public static errors: SavedObjectsErrors;
  public errors: SavedObjectsErrors;

  constructor(repository: SavedObjectsRepository);

  /**
   * Persist an object
   */
  public create(
    type: string,
    attributes: any,
    options?: {
      id?: string;
      overwrite?: boolean;
    }
  ): Promise<{
    id: string;
    type: string;
    updated_at: string;
    version: number;
    attributes: any;
  }>;

  /**
   * Create multiple documents at once
   */
  public bulkCreate(
    objects: Array<{
      type: string;
      id: string;
      attributes: any;
    }>,
    options?: {
      overwrite?: boolean;
    }
  ): Promise<{
    saved_objects: Array<
      | {
          id: string;
          type: string;
          error: {
            statusCode?: number;
            message: string;
          };
        }
      | {
          id: string;
          type: string;
          updated_at: string;
          version: number;
          attributes: any;
        }
    >;
  }>;

  /**
   * Delete an object
   */
  public delete(type: string, id: string): Promise<{}>;

  /**
   * Find objects
   */
  public find(options?: {
    type?: string | string[];
    search?: string;
    searchFields?: string;
    page?: number;
    perPage?: number;
    sortField?: string;
    sortOrder?: string;
    fields?: string[];
  }): Promise<{
    saved_objects: Array<{
      id: string;
      type: string;
      updated_at?: string;
      version: number;
      attributes: any;
    }>;
  }>;

  /**
   * Get an array of objects
   */
  public bulkGet(
    objects: Array<{ id: string; type: string }>
  ): Promise<{
    saved_objects: Array<{
      id: string;
      type: string;
      version: number;
      attributes: any;
    }>;
  }>;

  /**
   * Get a single object
   */
  public get(
    type: string,
    id: string
  ): Promise<{
    id: string;
    type: string;
    updated_at?: string;
    version: number;
    attributes: any;
  }>;

  /**
   * Update an object
   */
  public update(
    type: string,
    id: string,
    attributes: any,
    options?: { version?: number }
  ): Promise<{
    id: string;
    type: string;
    updated_at: string;
    version: number;
    attributes: any;
  }>;
}
