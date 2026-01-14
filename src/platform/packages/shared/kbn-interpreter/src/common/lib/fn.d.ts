/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Arg } from './arg';

export interface FnConfig {
  name: string;
  type?: string;
  aliases?: string[];
  fn: (...args: unknown[]) => unknown;
  help?: string;
  args?: Record<string, unknown>;
  context?: {
    types?: string[];
  };
}

export interface Fn {
  name: string;
  type?: string;
  aliases: string[];
  fn: (...args: unknown[]) => Promise<unknown>;
  help: string;
  args: Record<string, Arg>;
  context: {
    types?: string[];
  };
  accepts: (type: string) => boolean;
}

export interface FnConstructor {
  new (config: FnConfig): Fn;
  (config: FnConfig): Fn;
}

export const Fn: FnConstructor;
