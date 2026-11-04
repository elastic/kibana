/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFile } from 'fs/promises';
import { parse } from 'yaml';
import { schema, type TypeOf } from '@kbn/config-schema';

const hosts = schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), {
  minSize: 1,
  maxSize: 100,
});

const encryptionKey = schema.maybe(schema.string({ minLength: 32 }));

const tenantSchema = schema.oneOf([
  schema.object({ hosts, username: schema.string(), password: schema.string(), encryptionKey }),
  schema.object({ hosts, serviceAccountToken: schema.string(), encryptionKey }),
]);

const tenantsFileSchema = schema.recordOf(schema.string(), tenantSchema);

export type TenantConfig = TypeOf<typeof tenantSchema>;

export const readTenantsFile = async (path: string): Promise<Record<string, TenantConfig>> =>
  tenantsFileSchema.validate(parse(await readFile(path, 'utf8')));
