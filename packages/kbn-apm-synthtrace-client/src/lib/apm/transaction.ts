/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmError } from './apm_error';
import { Event } from './event';
import { BaseSpan } from './base_span';
import { generateShortId } from '../utils/generate_id';
import { ApmFields } from './apm_fields';
import { getBreakdownMetrics } from './processors/get_breakdown_metrics';

export class Transaction extends BaseSpan {
  private _sampled: boolean = true;
  private readonly _errors: ApmError[] = [];
  private readonly _events: Event[] = [];

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
      error.fields['transaction.sampled'] = this.fields['transaction.sampled'];
    });

    this._events.forEach((event) => {
      event.fields['trace.id'] = this.fields['trace.id'];
      event.fields['transaction.id'] = this.fields['transaction.id'];
      event.fields['transaction.type'] = this.fields['transaction.type'];
      event.fields['transaction.sampled'] = this.fields['transaction.sampled'];
    });

    return this;
  }

  events(...events: Event[]) {
    events.forEach((event) => {
      event.fields['trace.id'] = this.fields['trace.id'];
      event.fields['transaction.id'] = this.fields['transaction.id'];
      event.fields['transaction.name'] = this.fields['transaction.name'];
      event.fields['transaction.type'] = this.fields['transaction.type'];
      event.fields['transaction.sampled'] = this.fields['transaction.sampled'];
    });

    this._events.push(...events);

    return this;
  }

  errors(...errors: ApmError[]) {
    errors.forEach((error) => {
      error.fields['trace.id'] = this.fields['trace.id'];
      error.fields['transaction.id'] = this.fields['transaction.id'];
      error.fields['transaction.name'] = this.fields['transaction.name'];
      error.fields['transaction.type'] = this.fields['transaction.type'];
      error.fields['transaction.sampled'] = this.fields['transaction.sampled'];
    });

    this._errors.push(...errors);

    return this;
  }

  duration(duration: number) {
    this.fields['transaction.duration.us'] = duration * 1000;
    return this;
  }

  sample(sampled: boolean = true) {
    this._sampled = this.fields['transaction.sampled'] = sampled;
    this._errors.forEach((error) => {
      error.fields['transaction.sampled'] = sampled;
    });
    this._events.forEach((event) => {
      event.fields['transaction.sampled'] = sampled;
    });
    return this;
  }

  serialize() {
    const [transaction, ...spans] = super.serialize();

    const errors = this._errors.flatMap((error) => error.serialize());
    const logEvents = this._events.flatMap((event) => event.serialize());

    const directChildren = this.getChildren().map((child) => child.fields);

    const events = [transaction];

    const breakdownMetrics = getBreakdownMetrics(events.concat(directChildren));

    if (this._sampled) {
      events.push(...spans);
    }

    return events.concat(errors).concat(breakdownMetrics).concat(logEvents);
  }
}
