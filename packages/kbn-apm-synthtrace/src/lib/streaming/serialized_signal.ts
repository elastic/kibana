/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Signal } from '../../dsl/signal';
import { Fields } from '../../dsl/fields';

export class SerializedSignal {
  public readonly index?: Lowercase<string>;
  public readonly dataStream?: Lowercase<string>;
  public readonly document: Record<string, any>;
  public readonly fields: Record<string, any>;

  constructor(signal: Signal<Fields>) {
    const target = signal.getWriteTarget();
    if (target?.kind === 'index') this.index = target.target;
    else if (target?.kind === 'dataStream') this.dataStream = target.target;
    this.document = signal.toDocument();
    this.fields = signal.fields;
  }
}
