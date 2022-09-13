/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields } from './apm_fields';
import { BaseApmSignal } from './base_apm_signal';

export class Metricset<TFields extends ApmFields> extends BaseApmSignal<TFields> {
  constructor(fields: TFields) {
    super({
      'processor.event': 'metric',
      'processor.name': 'metric',
      ...fields,
    });
  }
}
