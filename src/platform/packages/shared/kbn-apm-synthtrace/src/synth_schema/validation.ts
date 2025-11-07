/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDslSchema, type CapabilityManifest } from './dsl';
import { loadManifest } from './generator';

export function validateConfig(manifest: CapabilityManifest, data: unknown) {
  const schema = buildDslSchema(manifest);
  const res = schema.safeParse(data);
  if (res.success) return { ok: true as const, value: res.data };
  return {
    ok: false as const,
    errors: res.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
      code: i.code,
    })),
  };
}

export function validateConfigWithManifest(data: unknown) {
  const manifest = loadManifest();
  return validateConfig(manifest, data);
}
