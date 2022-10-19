/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../../../dsl/fields';
import { Signal } from '../../../dsl/signal';
import { dataStream, index, WriteTarget } from '../../../dsl/write_target';
import { SignalTransferData } from './signal_transfer_data';

// Represents a Signal<> implementation that can receive SignalTransferData
// that was sent over the wire.
export class TransferredSignal extends Signal<Fields> {
  public readonly index?: Lowercase<string>;
  public readonly dataStream?: Lowercase<string>;
  private readonly document: Record<string, any>;

  constructor(signal: SignalTransferData) {
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
