/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { IconType } from '@elastic/eui';
import { KibanaRequest } from 'src/core/server';

/** @public */
export enum TutorialsCategory {
  LOGGING = 'logging',
  SIEM = 'siem',
  METRICS = 'metrics',
  OTHER = 'other',
}
export interface ParamTypes {
  NUMBER: string;
  STRING: string;
}
export interface InstructionSetSchema {
  readonly title: string;
  readonly callOut: {
    title: string;
    message: string;
    iconType: IconType;
  };
}
export interface ParamsSchema {
  defaultValue: any;
  id: string;
  label: string;
  type: ParamTypes;
}
export interface InstructionsSchema {
  readonly instructionSets: InstructionSetSchema[];
  readonly params: ParamsSchema[];
}
export interface DashboardSchema {
  id: string;
  linkLabel?: {
    is: boolean;
    then: any;
  };
  isOverview: boolean;
}
export interface ArtifactsSchema {
  readonly exportedFields: {
    documentationUrl: string;
  };
  readonly dashboards: DashboardSchema[];
  readonly application: {
    path: string;
    label: string;
  };
}
export interface TutorialSchema {
  id: string;
  category: TutorialsCategory;
  name: string;
  isBeta: boolean;
  shortDescription: string;
  euiIconType: IconType; // EUI icon type string, one of https://elastic.github.io/eui/#/icon;
  longDescription: string;
  completionTimeMinutes: number;
  previewImagePath: string;

  // kibana and elastic cluster running on prem
  onPrem: InstructionsSchema;

  // kibana and elastic cluster running in elastic's cloud
  elasticCloud: InstructionsSchema;

  // kibana running on prem and elastic cluster running in elastic's cloud
  onPremElasticCloud: InstructionsSchema;

  // Elastic stack artifacts produced by product when it is setup and run.
  artifacts: ArtifactsSchema;

  // saved objects used by data module.
  savedObjects: any[];
  savedObjectsInstallMsg: string;
}
export type TutorialProvider = (context: { [key: string]: unknown }) => TutorialSchema;
export type TutorialContextFactory = (
  req: KibanaRequest<
    Readonly<{
      [x: string]: any;
    }>,
    Readonly<{
      [x: string]: any;
    }>,
    Readonly<{
      [x: string]: any;
    }>
  >
) => { [key: string]: unknown };
export type ScopedTutorialContextFactory = (...args: any[]) => any;
