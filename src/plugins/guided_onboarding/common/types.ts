/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type UseCase = 'observability' | 'security' | 'search';

export type StepStatus = 'incomplete' | 'complete' | 'in_progress';

export interface StepConfig {
  id: string;
  title: string;
  descriptionList: string[];
  location?: {
    appID: string;
    path: string;
  };
  status?: StepStatus;
}
export interface GuideConfig {
  title: string;
  description: string;
  docs?: {
    text: string;
    url: string;
  };
  steps: StepConfig[];
}

export type GuidesConfig = {
  [key in UseCase]: GuideConfig;
};
