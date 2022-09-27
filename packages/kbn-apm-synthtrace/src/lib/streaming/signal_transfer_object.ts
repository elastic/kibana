/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../../dsl/fields';
import { Signal } from '../../dsl/signal';
import { dataStream, index, WriteTarget } from '../../dsl/write_target';
import { SerializedSignal } from './serialized_signal';

export class SignalTransferObject extends Signal<Fields> {
  public readonly index?: Lowercase<string>;
  public readonly dataStream?: Lowercase<string>;
  private readonly document: Record<string, any>;

  constructor(signal: SerializedSignal) {
    super(signal.fields);
    this.index = signal.index;
    this.dataStream = signal.dataStream;
    this.document = signal.document;
  }

  toDocument(): Record<string, any> {
    return this.document;
  }

  getWriteTarget(): WriteTarget | undefined {
    if (this.index) return index(this.index);
    else if (this.dataStream) return dataStream(this.dataStream);
    return undefined;
  }
}
