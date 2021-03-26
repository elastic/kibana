/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '../../../../src/core/types';
import { experiments, experimentIDs, ExperimentID, ExperimentConfig } from '../common';

const experimentSettings: Record<ExperimentID, UiSettingsParams<boolean>> = experimentIDs.reduce(
  (acc, id) => {
    const experiment = experiments[id];
    const { name, description, isActive: value } = experiment;
    acc[id] = {
      name,
      value,
      description,
      schema: schema.boolean(),
    };
    return acc;
  },
  {} as {
    [id in ExperimentID]: Pick<ExperimentConfig, 'name' | 'description'> & {
      value: boolean;
      schema: ReturnType<typeof schema.boolean>;
    };
  }
);

/**
 * uiSettings definitions for Presentation Util.
 */
export const getUISettings = (): Record<string, UiSettingsParams<boolean>> => ({
  ...experimentSettings,
});
