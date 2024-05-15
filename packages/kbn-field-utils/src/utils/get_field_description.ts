/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export async function getFieldEcsDescription(name: string) {
  const { EcsFlat } = await import('@elastic/ecs');
  const { description } = EcsFlat[name as keyof typeof EcsFlat] ?? {};
  return description || '';
}

export async function getFieldDescription(
  name: string,
  description: string | undefined,
  useEcs?: boolean
): Promise<string> {
  if (description) {
    return description;
  }
  if (useEcs) {
    return getFieldEcsDescription(name);
  }
  return '';
}
