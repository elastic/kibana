/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Axios from 'axios';
import { ValidationResult } from './ask';

interface Body {
  match?: string;
  suggestions: string[];
}

export async function validateElasticTeam(owner: string): Promise<ValidationResult> {
  const slug = owner.startsWith('@') ? owner.slice(1) : owner;

  const res = await Axios.get<Body>('https://ci-stats.kibana.dev/v1/_validate_kibana_team', {
    params: {
      slug,
    },
    timeout: 5000,
  });

  if (res.data.match) {
    return `@${res.data.match}`;
  }

  const err = `"${owner}" doesn't match any @elastic team, to override with another valid Github user pass the value with the --owner flag`;

  if (!res.data.suggestions?.length) {
    return { err };
  }

  const list = res.data.suggestions.map((l) => `    @${l}`);
  return {
    err: `${err}\n  Did you mean one of these?\n${list.join('\n')}`,
  };
}
