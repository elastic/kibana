/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from 'src/core/server';
import type { TutorialSchema } from './tutorial_schema';
export { TutorialsCategory } from '../../../../common/constants';

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

export type Platform = 'WINDOWS' | 'OSX' | 'DEB' | 'RPM';

export interface TutorialContext {
  kibanaBranch: string;
  [key: string]: unknown;
}
export type TutorialProvider = (context: TutorialContext) => TutorialSchema;
export type TutorialContextFactory = (req: KibanaRequest) => { [key: string]: unknown };
export type ScopedTutorialContextFactory = (...args: any[]) => any;
