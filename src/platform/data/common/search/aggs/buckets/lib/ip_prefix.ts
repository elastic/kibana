/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface IpPrefixAggKey {
  type: 'ip_prefix';
  address: string;
  prefix_length: number;
}

export type IpPrefixKey = IpPrefixAggKey;

export const convertIPPrefixToString = (cidr: IpPrefixKey, format: (val: any) => string) => {
  return format(cidr.address);
};
