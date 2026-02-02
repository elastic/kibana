/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Fields } from '../entity';
import { Serializable } from '../serializable';

export abstract class AbstractSpan<
  TFields extends Fields,
  TChild extends AbstractSpan<TFields, any>
> extends Serializable<TFields> {
  protected _children: TChild[] = [];

  constructor(fields: TFields) {
    super(fields);
  }

  getChildren(): TChild[] {
    return this._children;
  }

  children(...children: TChild[]): this {
    for (const child of children) {
      child.parent(this);
    }
    this._children.push(...children);
    return this;
  }

  serialize(): TFields[] {
    return [this.fields, ...this.getChildren().flatMap((child) => child.serialize())];
  }

  abstract parent(span: TChild): this;
  abstract success(): this;
  abstract failure(): this;
  abstract outcome(outcome: 'success' | 'failure' | 'unknown'): this;
  abstract isSpan(): boolean;
  abstract isTransaction(): boolean;
}
