/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { PROFILE_STATE_URL_KEY } from '../../../../../common/constants';
import {
  ProfileStateType,
  type ProfileStateDefinition,
  type ProfileStateRegistry,
} from '../../../../context_awareness';
import type { TabState } from '../redux';

export type ProfileUrlState = Record<string, object | undefined>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDefinedState = <TState extends object>(state: TState): TState | undefined => {
  return Object.keys(state).length ? state : undefined;
};

const getUrlStateForDefinition = ({
  profileState,
  profileStateDefinition,
  profileStateRegistry,
  shouldMergeDefaults,
}: {
  profileState: ProfileUrlState | undefined;
  profileStateDefinition: ProfileStateDefinition<object>;
  profileStateRegistry: ProfileStateRegistry;
  shouldMergeDefaults?: boolean;
}) => {
  return profileStateRegistry.pickStateByType({
    profileState: profileState
      ? { [profileStateDefinition.key]: profileState[profileStateDefinition.key] }
      : undefined,
    stateType: ProfileStateType.Url,
    shouldMergeDefaults,
  })[profileStateDefinition.key];
};

const getDefaultUrlState = ({
  profileStateDefinition,
  profileStateRegistry,
}: {
  profileStateDefinition: ProfileStateDefinition<object>;
  profileStateRegistry: ProfileStateRegistry;
}) => {
  return (
    getUrlStateForDefinition({
      profileState: { [profileStateDefinition.key]: profileStateDefinition.defaultState },
      profileStateDefinition,
      profileStateRegistry,
    }) ?? {}
  );
};

const omitDefaultUrlFields = ({
  profileUrlState,
  defaultUrlState,
}: {
  profileUrlState: object;
  defaultUrlState: object;
}) => {
  const nextUrlState: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(profileUrlState)) {
    const defaultValue = Object.entries(defaultUrlState).find(
      ([defaultKey]) => defaultKey === key
    )?.[1];

    if (!isEqual(defaultValue, value)) {
      nextUrlState[key] = value;
    }
  }

  return getDefinedState(nextUrlState);
};

export const getProfileUrlStateFromUrl = (urlStateStorage: IKbnUrlStateStorage) => {
  const rawProfileUrlState = urlStateStorage.get<unknown>(PROFILE_STATE_URL_KEY);

  if (!isRecord(rawProfileUrlState)) {
    return undefined;
  }

  const profileUrlState: ProfileUrlState = {};

  for (const [key, value] of Object.entries(rawProfileUrlState)) {
    if (isRecord(value)) {
      profileUrlState[key] = value;
    }
  }

  return getDefinedState(profileUrlState);
};

export const getProfileUrlState = ({
  profileState,
  profileStateDefinition,
  profileStateRegistry,
}: {
  profileState: TabState['profileState'];
  profileStateDefinition: ProfileStateDefinition<object> | undefined;
  profileStateRegistry: ProfileStateRegistry;
}): ProfileUrlState | undefined => {
  if (!profileStateDefinition) {
    return undefined;
  }

  const profileUrlState = getUrlStateForDefinition({
    profileState,
    profileStateDefinition,
    profileStateRegistry,
  });

  if (!profileUrlState) {
    return undefined;
  }

  const prunedProfileUrlState = omitDefaultUrlFields({
    profileUrlState,
    defaultUrlState: getDefaultUrlState({ profileStateDefinition, profileStateRegistry }),
  });

  if (!prunedProfileUrlState) {
    return undefined;
  }

  return { [profileStateDefinition.key]: prunedProfileUrlState };
};

export const getProfileStateWithUrlState = ({
  profileState,
  profileUrlState,
  profileStateDefinition,
  profileStateRegistry,
}: {
  profileState: TabState['profileState'];
  profileUrlState: ProfileUrlState | undefined;
  profileStateDefinition: ProfileStateDefinition<object> | undefined;
  profileStateRegistry: ProfileStateRegistry;
}) => {
  if (!profileStateDefinition) {
    return undefined;
  }

  const defaultUrlState = getDefaultUrlState({ profileStateDefinition, profileStateRegistry });
  const profileUrlStateForDefinition =
    getUrlStateForDefinition({
      profileState: profileUrlState,
      profileStateDefinition,
      profileStateRegistry,
    }) ?? {};
  const currentProfileState = profileState[profileStateDefinition.key];

  if (!currentProfileState && !Object.keys(profileUrlStateForDefinition).length) {
    return undefined;
  }

  return {
    ...(currentProfileState ?? profileStateDefinition.defaultState),
    ...defaultUrlState,
    ...profileUrlStateForDefinition,
  };
};
