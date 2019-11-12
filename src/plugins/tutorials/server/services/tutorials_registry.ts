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
import { CoreSetup } from 'src/core/server';
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
  readonly id: string;
  readonly category: TutorialsCategory;
  readonly name: string;
  readonly isBeta: boolean;
  readonly shortDescription: string;
  readonly euiIconType: IconType; // EUI icon type string, one of https://elastic.github.io/eui/#/icon;
  readonly longDescription: string;
  readonly completionTimeMinutes: number;
  readonly previewImagePath: string;

  // kibana and elastic cluster running on prem
  readonly onPrem: InstructionsSchema;

  // kibana and elastic cluster running in elastic's cloud
  readonly elasticCloud: InstructionsSchema;

  // kibana running on prem and elastic cluster running in elastic's cloud
  readonly onPremElasticCloud: InstructionsSchema;

  // Elastic stack artifacts produced by product when it is setup and run.
  readonly artifacts: ArtifactsSchema;

  // saved objects used by data module.
  readonly savedObjects: any[];
  readonly savedObjectsInstallMsg: string;
}

export class TutorialsRegistry {
  public setup(core: CoreSetup) {
    const tutorialProviders: Array<(tutorialProvider: TutorialSchema) => void>;
    const scopedTutorialContextFactories: Array<(scopedTutorialContextFactory: any) => void>;
    core.http.registerRouteHandlerContext('getTutorials', (request: any) => {
      const intitialContext = new Map<string, TutorialSchema>();
      const scopedContext = scopedTutorialContextFactories.reduce(
        (accumulatedContext, contextFactory) => {
          return { ...accumulatedContext, ...contextFactory(request) };
        },
        intitialContext
      );
      return tutorialProviders.map(tutorialProvider => {
        return tutorialProvider(scopedContext);
      });
    });

    return {
      register: () => {},
    };
  }

  public start() {
    return {
      get: () => {},
    };
  }
}

export type TutorialsRegistrySetup = ReturnType<TutorialsRegistry['setup']>;
export type TutorialsRegistryStart = ReturnType<TutorialsRegistry['start']>;

// from Josh Dover: (this should actually be the TutorialsRegistry)
/*
class TutorialsPlugin {
  setup(core) {
    const tutorialProviders = [];
    const scopedTutorialContextFactories = [];

    core.http.registerRouteHandlerContext('getTutorials', (request) => {
      const initialContext = {};
      const scopedContext = scopedTutorialContextFactories.reduce((accumulatedContext, contextFactory) => {
        return { ...accumulatedContext, ...contextFactory(request) };
      }, initialContext);

      return tutorialProviders.map((tutorialProvider) => {
        return tutorialProvider(server, scopedContext);
      });
    });

    return {
      registerTutorial(specProvider) { // specProvider should implement TutorialSchema
        const emptyContext = {};
        const { error } = Joi.validate(specProvider(server, emptyContext), tutorialSchema); // the tutorialSchema's been typed in TutorialSchema

        if (error) {
          throw new Error(`Unable to register tutorial spec because its invalid. ${error}`);
        }

        tutorialProviders.push(specProvider);
      }
    };
  }
}
*/
