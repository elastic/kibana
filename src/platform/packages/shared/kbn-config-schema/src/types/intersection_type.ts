/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Props, ObjectTypeOptions, ObjectResultTypeInput, ObjectProps } from './object_type';
import { ObjectType } from './object_type';
import type { DefaultValue } from './type';

export type IntersectionTypeOptions<
  T extends ObjectProps<Props>,
  D extends DefaultValue<ObjectResultTypeInput<T>>
> = ObjectTypeOptions<T, D>;

export class IntersectionType<
  RTS extends Array<ObjectType<any>>,
  T extends ObjectProps<Props>,
  D extends DefaultValue<ObjectResultTypeInput<T>>
> extends ObjectType<T, D> {
  constructor(types: RTS, options?: IntersectionTypeOptions<T, D>) {
    const props = types.reduce((mergedProps, type) => {
      Object.entries(type.getPropSchemas() as Record<string, any>).forEach(([key, value]) => {
        if (mergedProps[key] !== undefined) {
          throw new Error(`Duplicate key found in intersection: '${key}'`);
        }
        mergedProps[key as keyof T] = value;
      });

      return mergedProps;
    }, {} as T);

    super(props, options);
  }
}
