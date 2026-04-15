/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, IStaticAssets } from '@kbn/core/server';
import type { TutorialSchema } from './tutorial_schema';
export { TutorialsCategory } from '../../../../common/constants';

export type {
  TutorialSchema,
  ArtifactsSchema,
  DashboardSchema,
  InstructionsSchema,
  StatusCheckSchema,
  InstructionSetSchema,
  InstructionVariant,
  Instruction,
} from './tutorial_schema';

export type Platform = 'WINDOWS' | 'OSX' | 'DEB' | 'RPM';

export interface TutorialContext {
  kibanaBranch: string;
  staticAssets: IStaticAssets;
  isServerless?: boolean;
  [key: string]: unknown;
}
export type TutorialProvider = (context: TutorialContext) => TutorialSchema;
export type TutorialContextFactory = (req: KibanaRequest) => { [key: string]: unknown };
export type ScopedTutorialContextFactory = (...args: any[]) => any;
