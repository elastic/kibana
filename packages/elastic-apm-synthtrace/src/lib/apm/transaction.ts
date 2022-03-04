/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmError } from './apm_error';
import { BaseSpan } from './base_span';
import { generateShortId } from '../utils/generate_id';
import { ApmFields } from './apm_fields';

export class Transaction extends BaseSpan {
  private _sampled: boolean = true;
  private readonly _errors: ApmError[] = [];

  constructor(fields: ApmFields) {
    super({
      ...fields,
      'processor.event': 'transaction',
      'transaction.id': generateShortId(),
      'transaction.sampled': true,
    });
  }

  parent(span: BaseSpan) {
    super.parent(span);

    this._errors.forEach((error) => {
      error.fields['trace.id'] = this.fields['trace.id'];
      error.fields['transaction.id'] = this.fields['transaction.id'];
      error.fields['transaction.type'] = this.fields['transaction.type'];
    });

    return this;
  }

  errors(...errors: ApmError[]) {
    errors.forEach((error) => {
      error.fields['trace.id'] = this.fields['trace.id'];
      error.fields['transaction.id'] = this.fields['transaction.id'];
      error.fields['transaction.type'] = this.fields['transaction.type'];
    });

    this._errors.push(...errors);

    return this;
  }

  duration(duration: number) {
    this.fields['transaction.duration.us'] = duration * 1000;
    return this;
  }

  sample(sampled: boolean = true) {
    this._sampled = sampled;
    return this;
  }

  serialize() {
    const [transaction, ...spans] = super.serialize();

    const errors = this._errors.flatMap((error) => error.serialize());

    const events = [transaction];
    if (this._sampled) {
      events.push(...spans);
    }

    return events.concat(errors);
  }
}
