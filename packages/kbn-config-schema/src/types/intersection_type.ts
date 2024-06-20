/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ObjectType, Props, ObjectTypeOptions } from './object_type';

export type IntersectionTypeOptions<T extends Props = any> = ObjectTypeOptions<T>;

export class IntersectionType<
  RTS extends Array<ObjectType<any>>,
  T extends Props
> extends ObjectType<T> {
  constructor(types: RTS, options?: IntersectionTypeOptions<T>) {
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
