/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { mapValues } from 'lodash';
import { UiSettingsParams } from '../../../../src/core/types';
import { experiments, ExperimentID } from '../common';

const experimentSettings: Record<ExperimentID, UiSettingsParams<boolean>> = mapValues(
  experiments,
  (experiment) => {
    const { name, description, isActive: value } = experiment;
    return {
      name,
      value,
      description,
      schema: schema.boolean(),
    };
  }
);

/**
 * uiSettings definitions for Presentation Util.
 */
export const getUISettings = (): Record<string, UiSettingsParams<boolean>> => ({
  ...experimentSettings,
});
