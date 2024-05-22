/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Entity, EntityDocument } from './entities';

export interface ServiceEntityDocument extends EntityDocument {
  'service.language.name'?: string;
  'service.name': string;
  'service.node.name'?: string;
  'service.environment'?: string;
}

export class ServiceEntity extends Entity<ServiceEntityDocument> {
  constructor(fields: ServiceEntityDocument) {
    super({ ...fields });
  }
}
