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
import { Type, TypeOptions } from './type';

export type URIOptions = TypeOptions<string> & {
  scheme?: string | string[];
};

export class URIType extends Type<string> {
  constructor(options: URIOptions = {}) {
    super(internals.string().uri({ scheme: options.scheme }), options);
  }

  protected handleError(type: string, { value, scheme }: Record<string, unknown>) {
    switch (type) {
      case 'any.required':
      case 'string.base':
        return `expected value of type [string] but got [${typeDetect(value)}].`;
      case 'string.uriCustomScheme':
        return `expected URI with scheme [${scheme}].`;
      case 'string.uri':
        return `value must be a valid URI (see RFC 3986).`;
    }
  }
}
