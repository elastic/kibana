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
import { injectMetaAttributes, toSavedObjectWithMeta } from '../lib';
import { SavedObjectsManagement, type ISavedObjectsManagement } from '../services';

@injectable()
export class BulkGetRoute {
  static method = 'post' as const;
  static handleLegacyErrors = true;
  static path = '/api/kibana/management/saved_objects/_bulk_get';
  static security = {
    authz: {
      enabled: false,
      reason: 'This route is opted out from authorization',
    },
  } as const;
  static validate = {
    body: schema.arrayOf(
      schema.object({
        type: schema.string(),
        id: schema.string(),
      })
    ),
  };

  private readonly client: SavedObjectsClientContract;

  constructor(
    @inject(SavedObjectsClientFactory) clientFactory: ISavedObjectsClientFactory,
    @inject(SavedObjectsTypeRegistry) typeRegistry: ISavedObjectTypeRegistry,
    @inject(SavedObjectsManagement) private readonly management: ISavedObjectsManagement,
    @inject(Request)
    private readonly request: KibanaRequest<
      never,
      never,
      TypeOf<typeof BulkGetRoute.validate.body>
    >,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {
    this.client = clientFactory({
      includedHiddenTypes: chain(request.body)
        .map(({ type }) => type)
        .uniq()
        .filter(
          (type) => typeRegistry.isHidden(type) && typeRegistry.isImportableAndExportable(type)
        )
        .value(),
    });
  }

  async handle() {
    const response = await this.client.bulkGet<unknown>(this.request.body);
    const body: v1.BulkGetResponseHTTP = response.saved_objects.map((obj) => {
      const so = toSavedObjectWithMeta(obj);
      if (!so.error) {
        return injectMetaAttributes(obj, this.management);
      }
      return so;
    });

    return this.response.ok({ body });
  }
}
