/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnClient } from '@kbn/test';
import {
  guideStateSavedObjectsType,
  pluginStateSavedObjectsId,
  pluginStateSavedObjectsType,
  PluginStateSO,
} from '@kbn/guided-onboarding-plugin/server/saved_objects';
import { GuideState } from '@kbn/guided-onboarding';

export const createPluginState = async (client: KbnClient, state: PluginStateSO) => {
  await client.savedObjects.create({
    type: pluginStateSavedObjectsType,
    id: pluginStateSavedObjectsId,
    overwrite: true,
    attributes: state,
  });
};

export const createGuides = async (client: KbnClient, guides: GuideState[]) => {
  for (const guide of guides) {
    await client.savedObjects.create({
      type: guideStateSavedObjectsType,
      id: guide.guideId,
      overwrite: true,
      attributes: guide,
    });
  }
};
