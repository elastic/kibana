/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClient } from '@kbn/core/server';
import { findActiveGuide } from './guide_state_utils';
import type { PluginState, PluginStatus } from '../../common';
import {
  pluginStateSavedObjectsId,
  pluginStateSavedObjectsType,
  PluginStateSO,
} from '../saved_objects';

// hard code the duration to 30 days for now https://github.com/elastic/kibana/issues/144997
const activePeriodDurationInMilliseconds = 30 * 24 * 60 * 60 * 1000;
export const calculateIsActivePeriod = (creationDate?: string): boolean => {
  if (!creationDate) return false;
  const parsedCreationDate = Date.parse(creationDate);
  const endOfActivePeriodDate = new Date(parsedCreationDate + activePeriodDurationInMilliseconds);
  const now = new Date();
  return now < endOfActivePeriodDate;
};

export const getPluginState = async (savedObjectsClient: SavedObjectsClient) => {
  const pluginStateSO = await savedObjectsClient.find<PluginStateSO>({
    type: pluginStateSavedObjectsType,
  });
  if (pluginStateSO.saved_objects.length === 1) {
    const { status, creationDate } = pluginStateSO.saved_objects[0].attributes;
    const isActivePeriod = calculateIsActivePeriod(creationDate);
    const activeGuideSO = await findActiveGuide(savedObjectsClient);
    const pluginState: PluginState = { status: status as PluginStatus, isActivePeriod };
    if (activeGuideSO.saved_objects.length === 1) {
      pluginState.activeGuide = activeGuideSO.saved_objects[0].attributes;
    }
    return pluginState;
  } else {
    // create a SO to keep track of the correct creation date
    await updatePluginStatus(savedObjectsClient, 'not_started');
    return {
      status: 'not_started',
      isActivePeriod: true,
    };
  }
};

export const updatePluginStatus = async (
  savedObjectsClient: SavedObjectsClient,
  status: string
) => {
  return await savedObjectsClient.update<PluginStateSO>(
    pluginStateSavedObjectsType,
    pluginStateSavedObjectsId,
    {
      status,
    },
    {
      // if there is no saved object yet, insert a new SO with the creation date
      upsert: { status, creationDate: new Date().toISOString() },
    }
  );
};
