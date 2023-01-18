/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Entity } from '../entity';
import { ApmFields } from './apm_fields';
import { FaasTriggerType, Serverless } from './serverless';

export class ServerlessInstance extends Entity<ApmFields> {
  invocation(params: { transactionName?: string; faasTriggerType?: FaasTriggerType } = {}) {
    const { transactionName, faasTriggerType = 'other' } = params;
    return new Serverless({
      ...this.fields,
      'transaction.name': transactionName,
      'faas.trigger.type': faasTriggerType,
    });
  }
}
