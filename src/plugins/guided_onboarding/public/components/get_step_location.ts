/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StepConfig } from '@kbn/guided-onboarding';
import { PluginState } from '../../common';

export const getStepLocationPath = (
  location: StepConfig['location'],
  pluginState: PluginState
): string | undefined => {
  if (location && location.params && pluginState.activeGuide?.params) {
    const { path, params } = location;
    let dynamicPath = path;
    for (const param of params) {
      dynamicPath = dynamicPath.replace(`{${param}}`, pluginState.activeGuide?.params[param]);
    }
    return dynamicPath;
  }
  return location?.path;
};
