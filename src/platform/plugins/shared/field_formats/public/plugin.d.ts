/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { FieldFormatsRegistry } from '../common';
import type { FormatFactory } from '../common/types';
export declare class FieldFormatsPlugin implements Plugin<FieldFormatsSetup, FieldFormatsStart> {
  private readonly fieldFormatsRegistry;
  setup(core: CoreSetup): FieldFormatsSetup;
  start(): FieldFormatsStart;
  stop(): void;
}
/** @public */
export type FieldFormatsSetup = Pick<FieldFormatsRegistry, 'register' | 'has'>;
/** @public */
export type FieldFormatsStart = Omit<FieldFormatsRegistry, 'init' | 'register'> & {
  deserialize: FormatFactory;
};
