/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface Fields {
  '@timestamp'?: number;
}

export class Entity<TFields extends Fields> {
  constructor(public readonly fields: TFields) {
    this.fields = fields;
  }

  defaults(defaults: TFields) {
    Object.keys(defaults).forEach((key) => {
      const fieldName: keyof TFields = key as any;

      if (!(fieldName in this.fields)) {
        this.fields[fieldName] = defaults[fieldName] as any;
      }
    });

    return this;
  }
}
