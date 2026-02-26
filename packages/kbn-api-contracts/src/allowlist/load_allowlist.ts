/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

export interface AllowlistEntry {
  path: string;
  method: string;
  reason: string;
  approvedBy: string;
  prUrl?: string;
  expiresAt?: string;
}

export interface Allowlist {
  description?: string;
  entries: AllowlistEntry[];
}

const getDefaultAllowlistPath = (): string => resolve(dirname(__dirname), '..', 'allowlist.json');

export const loadAllowlist = (allowlistPath?: string): Allowlist => {
  const filePath = allowlistPath ?? getDefaultAllowlistPath();

  if (!existsSync(filePath)) {
    return { entries: [] };
  }

  const content = readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content) as Allowlist;

  const activeEntries = parsed.entries.filter((entry) => {
    if (entry.expiresAt) {
      const expirationDate = new Date(entry.expiresAt);
      return expirationDate > new Date();
    }
    return true;
  });

  return {
    ...parsed,
    entries: activeEntries,
  };
};

export const isAllowlisted = (allowlist: Allowlist, path: string, method: string): boolean => {
  const normalizedMethod = method.toLowerCase();
  return allowlist.entries.some(
    (entry) => entry.path === path && entry.method.toLowerCase() === normalizedMethod
  );
};
