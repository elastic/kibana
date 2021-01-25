/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import typeDetect from 'type-detect';
import { internals } from '../internals';
import { Type, TypeOptions } from './type';

export type IpVersion = 'ipv4' | 'ipv6';
export type IpOptions = TypeOptions<string> & {
  /**
   * IP versions to accept, defaults to ['ipv4', 'ipv6'].
   */
  versions: IpVersion[];
};

export class IpType extends Type<string> {
  constructor(options: IpOptions = { versions: ['ipv4', 'ipv6'] }) {
    const schema = internals.string().ip({ version: options.versions, cidr: 'forbidden' });
    super(schema, options);
  }

  protected handleError(type: string, { value, version }: Record<string, any>) {
    switch (type) {
      case 'string.base':
        return `expected value of type [string] but got [${typeDetect(value)}]`;
      case 'string.ipVersion':
        return `value must be a valid ${version.join(' or ')} address`;
    }
  }
}
