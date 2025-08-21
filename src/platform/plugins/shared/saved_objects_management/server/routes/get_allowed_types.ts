/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject, injectable } from 'inversify';
import { Response, SavedObjectsTypeRegistry } from '@kbn/core-di-server';
import type {
  ISavedObjectTypeRegistry,
  KibanaResponseFactory,
  SavedObjectsType,
} from '@kbn/core/server';
import type { SavedObjectManagementTypeInfo } from '../../common';

function convertType(sot: SavedObjectsType): SavedObjectManagementTypeInfo {
  return {
    name: sot.name,
    namespaceType: sot.namespaceType,
    hidden: sot.hidden,
    displayName: sot.management?.displayName ?? sot.name,
  };
}

@injectable()
export class GetAllowedTypesRoute {
  static method = 'get' as const;
  static path = '/api/kibana/management/saved_objects/_allowed_types';
  static security = {
    authz: {
      enabled: false,
      reason: 'This route is opted out from authorization',
    },
  } as const;
  static validate = false as const;

  constructor(
    @inject(SavedObjectsTypeRegistry) private readonly typeRegistry: ISavedObjectTypeRegistry,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {}

  async handle() {
    const allowedTypes = this.typeRegistry
      .getImportableAndExportableTypes()
      .filter(({ management }) => management!.visibleInManagement ?? true)
      .map(convertType);

    return this.response.ok({
      body: {
        types: allowedTypes,
      },
    });
  }
}
