/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields } from './apm_fields';
import { Serializable } from '../serializable';

export class Event extends Serializable<ApmFields> {
  constructor(fields: ApmFields) {
    super({
      ...fields,
      'event.kind': 'event',

      // Real log events don't have the "processor.event" attribute. See: https://github.com/elastic/apm-server/pull/11494
      // This is a hack needed for the tests in "mobile/mobile_location_stats.spec.ts" to pass since the "SynthtraceEsClient.index" function
      // inside "packages/kbn-apm-synthtrace/src/lib/shared/base_client.ts" requires this "processor.event" attr to be available,
      // otherwise it'd throw this error: "Could not determine operation: _index and _action not defined in document".
      'processor.event': 'error',
    });
  }

  lifecycle(state: string): this {
    this.fields['labels.lifecycle_state'] = state;
    return this;
  }

  override timestamp(timestamp: number) {
    const ret = super.timestamp(timestamp);
    this.fields['timestamp.us'] = timestamp * 1000;
    return ret;
  }
}
