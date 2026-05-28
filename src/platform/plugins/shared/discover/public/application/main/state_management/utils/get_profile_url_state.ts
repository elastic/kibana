/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Serializable, SerializableRecord } from '@kbn/utility-types';
import type { DiscoverProfileUrlState } from '../../../../../common';
import {
  ProfileStateType,
  type ProfileStateDefinition,
  type ProfileStateRegistry,
} from '../../../../context_awareness';
import type { DiscoverInternalState, RuntimeStateManager, TabState } from '../redux';
import { selectTab, selectTabRuntimeState } from '../redux';

const isSerializable = (value: unknown): value is Serializable => {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isSerializable);
  }

  if (typeof value !== 'object') {
    return false;
  }

  return Object.values(value).every(isSerializable);
};

const isSerializableRecord = (value: unknown): value is SerializableRecord => {
  return (
    Boolean(value) && !Array.isArray(value) && typeof value === 'object' && isSerializable(value)
  );
};

const getFilteredUrlProfileState = ({
  definition,
  profileState,
  profileStateRegistry,
}: {
  definition: ProfileStateDefinition<object>;
  profileState: TabState['profileState'];
  profileStateRegistry: ProfileStateRegistry;
}) => {
  const filteredProfileState = profileStateRegistry.pickStateByType({
    profileState,
    stateType: ProfileStateType.Url,
  });

  const filteredUrlProfileState = filteredProfileState[definition.key];

  if (!filteredUrlProfileState || Object.keys(filteredUrlProfileState).length === 0) {
    return undefined;
  }

  if (!isSerializableRecord(filteredUrlProfileState)) {
    return undefined;
  }

  return filteredUrlProfileState;
};

export const getProfileUrlState = ({
  definition,
  profileState,
  profileStateRegistry,
}: {
  definition: ProfileStateDefinition<object>;
  profileState: TabState['profileState'];
  profileStateRegistry: ProfileStateRegistry;
}): DiscoverProfileUrlState | undefined => {
  const filteredUrlProfileState = getFilteredUrlProfileState({
    definition,
    profileState,
    profileStateRegistry,
  });

  if (!filteredUrlProfileState) {
    return undefined;
  }

  return {
    [definition.key]: filteredUrlProfileState,
  };
};

export const getProfileStateWithoutUrlFields = ({
  definition,
  profileState,
}: {
  definition: ProfileStateDefinition<object>;
  profileState: object | undefined;
}) => {
  if (!profileState) {
    return {};
  }

  const profileStateWithoutUrlFields = { ...profileState } as Record<string, unknown>;

  for (const [field, fieldDefinition] of Object.entries(definition.descriptor)) {
    if (fieldDefinition.type === ProfileStateType.Url) {
      delete profileStateWithoutUrlFields[field];
    }
  }

  return profileStateWithoutUrlFields;
};

export const getCurrentTabProfileUrlState = ({
  getState,
  runtimeStateManager,
  profileStateRegistry,
  tabId,
}: {
  getState: () => DiscoverInternalState;
  runtimeStateManager: RuntimeStateManager;
  profileStateRegistry: ProfileStateRegistry;
  tabId: string;
}): DiscoverProfileUrlState | undefined => {
  const tab = selectTab(getState(), tabId);
  const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
  const definition = tabRuntimeState?.scopedProfilesManager$.getValue().getContexts()
    .dataSourceContext.profileState;

  if (!tab || !definition) {
    return undefined;
  }

  return getProfileUrlState({
    definition,
    profileState: tab.profileState,
    profileStateRegistry,
  });
};

export const getRestoredProfileUrlState = ({
  definition,
  profileStateRegistry,
  profileUrlState,
}: {
  definition: ProfileStateDefinition<object>;
  profileStateRegistry: ProfileStateRegistry;
  profileUrlState: DiscoverProfileUrlState;
}) => {
  const restoredProfileState = profileUrlState[definition.key];

  if (!restoredProfileState) {
    return undefined;
  }

  return getFilteredUrlProfileState({
    definition,
    profileState: {
      [definition.key]: restoredProfileState,
    },
    profileStateRegistry,
  });
};
