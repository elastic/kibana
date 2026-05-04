/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';

const query = t.partial({
  foo: t.string,
});

const path = t.type({
  serviceName: t.string,
});

const params = t.type({ query, path });
const ENDPOINT = 'GET /internal/apm/foo/{serviceName}' as const;

export interface ReturnType {
  msg: string;
}

// eslint-disable-next-line import/no-default-export
export default { ENDPOINT, params } as const;
