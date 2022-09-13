/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from './fields';
import { dedot } from '../lib/utils/dedot';
import { Entity } from './entity';
import { WriteTarget } from './write_target';

const isSignal = Symbol('signal');
export abstract class Signal<TFields extends Fields> extends Entity<TFields> {
  constructor(fields: TFields) {
    super(fields);
    this[isSignal] = true;
  }

  public static IsSignal = isSignal;
  public [isSignal]: boolean | null;

  timestamp(time: number): this {
    this.fields['@timestamp'] = time;
    return this;
  }

  /** Called by the stream processor */
  enrichWithVersionInformation(version: string, versionMajor: number): this {
    return this;
  }

  /** Controls how the document is written to Elasticsearch */
  toDocument(): Record<string, any> {
    const newDoc: Record<string, any> = {};
    dedot(this.fields, newDoc);
    if (typeof newDoc['@timestamp'] === 'number') {
      const timestamp = newDoc['@timestamp'];
      newDoc['@timestamp'] = new Date(timestamp).toISOString();
    }
    return newDoc;
  }

  /** Each signal should indicate where it intends to write to */
  abstract getWriteTarget(): WriteTarget | undefined;

  /**
   * Yields the signal(s) to the stream processor
   * A signal may emit 0-Many signals depending on the use case its modelling
   */
  yieldSignals(): Array<Signal<TFields>> {
    return [this];
  }
}
