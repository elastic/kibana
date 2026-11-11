/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';

/**
 * Parses a spec served as JSON or YAML. YAML is parsed leniently, since vendor specs break the
 * strict rules (Zendesk's has duplicate keys), and aliases are expanded without a limit.
 */
export const parseSpecText = (text: string): unknown => {
  const trimmed = text.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }
  return parse(text, { uniqueKeys: false, strict: false, maxAliasCount: -1 });
};
