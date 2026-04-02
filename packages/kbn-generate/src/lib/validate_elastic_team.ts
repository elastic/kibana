/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ValidationResult } from './ask';

interface Body {
  match?: string;
  suggestions: string[];
}

export async function validateElasticTeam(owner: string): Promise<ValidationResult> {
  const slug = owner.startsWith('@') ? owner.slice(1) : owner;

  const url = new URL('https://ci-stats.kibana.dev/v1/_validate_kibana_team');
  url.searchParams.set('slug', slug);

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 5000);

  let res: Response;
  try {
    res = await fetch(url.toString(), { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`Failed to validate team: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as Body;

  if (data.match) {
    return `@${data.match}`;
  }

  const err = `"${owner}" doesn't match any @elastic team, to override with another valid Github user pass the value with the --owner flag`;

  if (!data.suggestions?.length) {
    return { err };
  }

  const list = data.suggestions.map((l) => `    @${l}`);
  return {
    err: `${err}\n  Did you mean one of these?\n${list.join('\n')}`,
  };
}
