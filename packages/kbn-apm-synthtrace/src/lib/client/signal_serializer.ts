/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../../dsl/fields';
import { Signal } from '../../dsl/signal';

interface SerializerOptions {
  enablePrototypePoisoningProtection?: boolean | 'proto' | 'constructor';
}

/**
 * This custom serializer exists because .bulk<Signal<TFields>>() has no option
 * to use Signal<> to control serialization and TFields as the DTO to send over the wire.
 * see: https://github.com/elastic/elasticsearch-js/issues/1209
 * see: https://github.com/elastic/elasticsearch-js/issues/1610
 */
export function createSignalSerializer(serializer: any) {
  // because e2e tests imports this package in public (client side) code
  // we need to shade the @elastic/elasticsearch import so that webpack
  // does not eagerly try to compile it on the client side which is explicitly
  // not supported the nodejs Elasticsearch client
  // InstanceType<Serializer> could therefor not be used
  return class SignalSerializer extends serializer {
    constructor(opts: SerializerOptions | undefined) {
      super(opts);
    }
    serialize(object: any): string {
      if (object != null && object[Signal.IsSignal]) {
        const s = object as Signal<Fields>;
        return super.serialize(s.toDocument());
      }
      return super.serialize(object);
    }
  };
}
