/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from 'src/core/server';
import type { TutorialSchema } from './tutorial_schema';
export type {
  TutorialSchema,
  ArtifactsSchema,
  DashboardSchema,
  InstructionsSchema,
  ParamsSchema,
  InstructionSetSchema,
  InstructionVariant,
  Instruction,
} from './tutorial_schema';

/** @public */
export enum TutorialsCategory {
  LOGGING = 'logging',
  SECURITY_SOLUTION = 'security',
  METRICS = 'metrics',
  OTHER = 'other',
}
export type Platform = 'WINDOWS' | 'OSX' | 'DEB' | 'RPM';

export interface TutorialContext {
  [key: string]: unknown;
}
export type TutorialProvider = (context: TutorialContext) => TutorialSchema;
export type TutorialContextFactory = (req: KibanaRequest) => { [key: string]: unknown };
export type ScopedTutorialContextFactory = (...args: any[]) => any;
