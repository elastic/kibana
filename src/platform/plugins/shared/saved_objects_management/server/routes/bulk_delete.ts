/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject, injectable } from 'inversify';
import { schema, type TypeOf } from '@kbn/config-schema';
import { Request, Response, SavedObjectsClient } from '@kbn/core-di-server';
import type {
  KibanaRequest,
  KibanaResponseFactory,
  SavedObjectsClientContract,
} from '@kbn/core/server';

@injectable()
export class BulkDeleteRoute {
  static method = 'post' as const;
  static handleLegacyErrors = true;
  static path = '/internal/kibana/management/saved_objects/_bulk_delete';
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

  constructor(
    @inject(SavedObjectsClient) private readonly client: SavedObjectsClientContract,
    @inject(Request)
    private readonly request: KibanaRequest<
      never,
      never,
      TypeOf<typeof BulkDeleteRoute.validate.body>
    >,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {}

  async handle() {
    const objects = this.request.body;
    const { statuses: body } = await this.client.bulkDelete(objects, { force: true });

    return this.response.ok({ body });
  }
}
