/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IconType } from '@elastic/eui';
import { KibanaRequest } from 'src/core/server';

/** @public */
export enum TutorialsCategory {
  LOGGING = 'logging',
  SECURITY_SOLUTION = 'security',
  METRICS = 'metrics',
  OTHER = 'other',
}
export type Platform = 'WINDOWS' | 'OSX' | 'DEB' | 'RPM';

export interface ParamTypes {
  NUMBER: string;
  STRING: string;
}
export interface Instruction {
  title?: string;
  textPre?: string;
  commands?: string[];
  textPost?: string;
}
export interface InstructionVariant {
  id: string;
  instructions: Instruction[];
}
export interface InstructionSetSchema {
  readonly title?: string;
  readonly callOut?: {
    title: string;
    message?: string;
    iconType?: IconType;
  };
  instructionVariants: InstructionVariant[];
}
export interface ParamsSchema {
  defaultValue: any;
  id: string;
  label: string;
  type: ParamTypes;
}
export interface InstructionsSchema {
  readonly instructionSets: InstructionSetSchema[];
  readonly params?: ParamsSchema[];
}
export interface DashboardSchema {
  id: string;
  linkLabel?: string;
  isOverview: boolean;
}
export interface ArtifactsSchema {
  exportedFields?: {
    documentationUrl: string;
  };
  dashboards: DashboardSchema[];
  application?: {
    path: string;
    label: string;
  };
}
export interface TutorialSchema {
  id: string;
  category: TutorialsCategory;
  name: string;
  moduleName?: string;
  isBeta?: boolean;
  shortDescription: string;
  euiIconType?: IconType; // EUI icon type string, one of https://elastic.github.io/eui/#/display/icons;
  longDescription: string;
  completionTimeMinutes?: number;
  previewImagePath?: string;

  // kibana and elastic cluster running on prem
  onPrem: InstructionsSchema;

  // kibana and elastic cluster running in elastic's cloud
  elasticCloud?: InstructionsSchema;

  // kibana running on prem and elastic cluster running in elastic's cloud
  onPremElasticCloud?: InstructionsSchema;

  // Elastic stack artifacts produced by product when it is setup and run.
  artifacts?: ArtifactsSchema;

  // saved objects used by data module.
  savedObjects?: any[];
  savedObjectsInstallMsg?: string;
}
export interface TutorialContext {
  [key: string]: unknown;
}
export type TutorialProvider = (context: TutorialContext) => TutorialSchema;
export type TutorialContextFactory = (req: KibanaRequest) => { [key: string]: unknown };
export type ScopedTutorialContextFactory = (...args: any[]) => any;
