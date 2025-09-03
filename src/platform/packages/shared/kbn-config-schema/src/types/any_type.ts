/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import { internals } from '../internals';
import { META_FIELD_X_OAS_ANY } from '../oas_meta_fields';
import { DefaultValue, Type, TypeOptions } from './type';

export class AnyType<D extends DefaultValue<any>> extends Type<any, D> {
  constructor(options?: TypeOptions<any, D>) {
    super(internals.any().meta({ [META_FIELD_X_OAS_ANY]: true }), options);
  }

  protected handleError(type: string, { value }: Record<string, any>) {
    if (type === 'any.required') {
      return `expected value of type [any] but got [${typeDetect(value)}]`;
    }
  }
}
