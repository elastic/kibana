/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject, injectable } from 'inversify';
import { chain } from 'lodash';
import { schema, type Type, type TypeOf } from '@kbn/config-schema';
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
import { injectMetaAttributes, toSavedObjectWithMeta } from '../lib';
import { SavedObjectsManagement, type ISavedObjectsManagement } from '../services';

const referenceSchema = schema.object({
  type: schema.string(),
  id: schema.string(),
});
const searchOperatorSchema = schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
  defaultValue: 'OR',
});
const sortFieldSchema: Type<keyof v1.SavedObjectWithMetadata> = schema.oneOf([
  schema.literal('created_at'),
  schema.literal('updated_at'),
  schema.literal('type'),
]);

@injectable()
export class FindRoute {
  static method = 'get' as const;
  static handleLegacyErrors = true;
  static path = '/api/kibana/management/saved_objects/_find';
  static security = {
    authz: {
      enabled: false,
      reason: 'This route is opted out from authorization',
    },
  } as const;
  static validate = {
    query: schema.object({
      perPage: schema.number({ min: 0, defaultValue: 20 }),
      page: schema.number({ min: 0, defaultValue: 1 }),
      type: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
      search: schema.maybe(schema.string()),
      defaultSearchOperator: searchOperatorSchema,
      sortField: schema.maybe(sortFieldSchema),
      sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
      hasReference: schema.maybe(schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema)])),
      hasReferenceOperator: searchOperatorSchema,
    }),
  };

  private readonly client: SavedObjectsClientContract;

  constructor(
    @inject(SavedObjectsClientFactory) clientFactory: ISavedObjectsClientFactory,
    @inject(SavedObjectsTypeRegistry) private readonly typeRegistry: ISavedObjectTypeRegistry,
    @inject(SavedObjectsManagement) private readonly management: ISavedObjectsManagement,
    @inject(Request)
    private readonly request: KibanaRequest<never, TypeOf<typeof FindRoute.validate.query>>,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {
    this.client = clientFactory({
      includedHiddenTypes: chain(request.query.type)
        .castArray()
        .uniq()
        .filter(
          (type) => typeRegistry.isHidden(type) && typeRegistry.isImportableAndExportable(type)
        )
        .value(),
    });
  }

  async handle() {
    const { query } = this.request;
    const searchFields = chain(query.type)
      .castArray()
      .filter((type) => this.typeRegistry.isImportableAndExportable(type))
      .map((type) => this.management.getDefaultSearchField(type))
      .filter((field): field is string => !!field)
      .uniq()
      .value();
    const findResponse = await this.client.find<any>({
      ...query,
      searchFields,
      fields: undefined,
    });
    const savedObjects = findResponse.saved_objects.map(toSavedObjectWithMeta).map((so) => ({
      ...injectMetaAttributes(so, this.management),
      attributes: {} as Record<string, unknown>,
    }));
    const response: v1.FindResponseHTTP = {
      saved_objects: savedObjects,
      total: findResponse.total,
      per_page: findResponse.per_page,
      page: findResponse.page,
    };

    return this.response.ok({ body: response });
  }
}
