/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { schema, Type } from '@kbn/config-schema';
import { isLeft } from 'fp-ts/lib/Either';

export function propsToSchema<T extends t.Type<any>>(type: T): Type<t.TypeOf<T>> {
  return schema.object(
    {},
    {
      unknowns: 'allow',
      validate: (val) => {
        const decoded = type.decode(val);

        if (isLeft(decoded)) {
          return PathReporter.report(decoded).join('\n');
        }
      },
    }
  );
}
