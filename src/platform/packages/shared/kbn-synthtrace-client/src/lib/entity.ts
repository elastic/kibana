/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type ObjectEntry<T> = [keyof T, T[keyof T]];

export type Fields<TMeta extends Record<string, any> | undefined = undefined> = {
  '@timestamp'?: number;
} & (TMeta extends undefined ? {} : Partial<{ meta: TMeta }>);

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

  overrides(overrides: Partial<TFields>) {
    const overrideEntries = Object.entries(overrides) as Array<ObjectEntry<TFields>>;

    overrideEntries.forEach(([fieldName, value]) => {
      this.fields[fieldName] = value;
    });

    return this;
  }
}
