/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ApmFields } from './apm_fields';
import { Serializable } from '../serializable';

export class Event extends Serializable<ApmFields> {
  constructor(fields: ApmFields) {
    super({
      ...fields,
    });
  }

  lifecycle(state: string): this {
    this.fields['event.action'] = 'lifecycle';
    this.fields['labels.lifecycle_state'] = state;
    return this;
  }

  override timestamp(timestamp: number) {
    const ret = super.timestamp(timestamp);
    this.fields['timestamp.us'] = timestamp * 1000;
    return ret;
  }
}
