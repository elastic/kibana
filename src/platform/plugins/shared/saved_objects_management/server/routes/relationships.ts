/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject, injectable } from 'inversify';
import { chain, castArray } from 'lodash';
import { schema, type TypeOf } from '@kbn/config-schema';
import {
  type ISavedObjectsClientFactory,
  Request,
  Response,
  SavedObjectsClientFactory,
  SavedObjectsTypeRegistry,
} from '@kbn/core-di-server';
import type {
  ISavedObjectTypeRegistry,
  KibanaRequest,
  KibanaResponseFactory,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { v1 } from '../../common';
import { findRelationships } from '../lib';
import { SavedObjectsManagement, type ISavedObjectsManagement } from '../services';

@injectable()
export class RelationshipsRoute {
  static method = 'get' as const;
  static handleLegacyErrors = true;
  static path = '/api/kibana/management/saved_objects/relationships/{type}/{id}';
  static security = {
    authz: {
      enabled: false,
      reason: 'This route is opted out from authorization',
    },
  } as const;
  static validate = {
    params: schema.object({
      type: schema.string(),
      id: schema.string(),
    }),
    query: schema.object({
      size: schema.number({ defaultValue: 10000 }),
      savedObjectTypes: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
    }),
  };

  private readonly client: SavedObjectsClientContract;

  constructor(
    @inject(SavedObjectsClientFactory) clientFactory: ISavedObjectsClientFactory,
    @inject(SavedObjectsTypeRegistry) typeRegistry: ISavedObjectTypeRegistry,
    @inject(SavedObjectsManagement) private readonly management: ISavedObjectsManagement,
    @inject(Request)
    private readonly request: KibanaRequest<
      TypeOf<typeof RelationshipsRoute.validate.params>,
      TypeOf<typeof RelationshipsRoute.validate.query>
    >,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {
    this.client = clientFactory({
      includedHiddenTypes: chain(request.query.savedObjectTypes)
        .castArray()
        .uniq()
        .filter(
          (type) => typeRegistry.isHidden(type) && typeRegistry.isImportableAndExportable(type)
        )
        .value(),
    });
  }

  async handle() {
    const { type, id } = this.request.params;
    const { size, savedObjectTypes } = this.request.query;
    const findRelationsResponse: v1.RelationshipsResponseHTTP = await findRelationships({
      type,
      id,
      client: this.client,
      size,
      referenceTypes: castArray(savedObjectTypes),
      savedObjectsManagement: this.management,
    });

    return this.response.ok({
      body: findRelationsResponse,
    });
  }
}
