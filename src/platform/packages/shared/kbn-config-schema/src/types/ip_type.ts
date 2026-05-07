/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import { ipv4 as zIpv4, ipv6 as zIpv6, z as zod } from '@kbn/zod';

import type { TypeOptions } from './interfaces';
import { Type } from './type';

export type IpVersion = 'ipv4' | 'ipv6';
export type IpOptions = TypeOptions<string> & {
  versions: IpVersion[];
};

export class IpType extends Type<string> {
  private readonly ipVersions: IpVersion[];

  constructor(options: IpOptions = { versions: ['ipv4', 'ipv6'] }) {
    const parts: zod.ZodTypeAny[] = [];
    if (options.versions.includes('ipv4')) {
      parts.push(zIpv4());
    }
    if (options.versions.includes('ipv6')) {
      parts.push(zIpv6());
    }
    const core =
      parts.length === 1
        ? parts[0]!
        : zod.union(parts as [zod.ZodTypeAny, zod.ZodTypeAny, ...zod.ZodTypeAny[]]);

    // Single-version IP schemas use the primitive directly so `z.toJSONSchema()` does not hit nested
    // `pipe` edges that break Zod v4's JSON Schema processor; multi-version still pipes string → union.
    const schema =
      parts.length === 1 ? core : (zod.string().pipe(core as any) as zod.ZodType<string>);

    super(schema, options);
    this.ipVersions = options.versions;
  }

  protected structureTypeLabel(): string {
    return 'string';
  }

  protected handleError(type: string, { value, message }: Record<string, any>) {
    switch (type) {
      case 'invalid_type':
        return `expected value of type [string] but got [${typeDetect(value)}]`;
      default:
        if (typeof message === 'string') {
          const t = message.trim();
          // Zod v4 pipe/union failures often surface as the generic "Invalid input" — keep legacy copy.
          if (t !== 'Invalid input' && !/^Invalid input$/i.test(t)) {
            return message;
          }
        }
        if (this.ipVersions.length === 1) {
          return this.ipVersions[0] === 'ipv4'
            ? 'value must be a valid ipv4 address'
            : 'value must be a valid ipv6 address';
        }
        return `value must be a valid ipv4 or ipv6 address`;
    }
  }
}
