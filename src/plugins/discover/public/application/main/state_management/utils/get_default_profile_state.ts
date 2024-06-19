/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import type { DiscoverAppState } from '../discover_app_state_container';
import { getMergedAccessor, ProfilesManager } from '../../../../context_awareness';

export const getDefaultProfileState = ({
  profilesManager,
  dataView,
}: {
  profilesManager: ProfilesManager;
  dataView: DataView;
}) => {
  const stateUpdate: DiscoverAppState = {};
  const defaultState = getDefaultState(profilesManager, dataView);
  const validColumns = defaultState.columns?.filter(({ name }) => dataView.getFieldByName(name));

  if (validColumns?.length) {
    const columns = validColumns.reduce<DiscoverGridSettings['columns']>(
      (acc, { name, width }) => (width ? { ...acc, [name]: { width } } : acc),
      undefined
    );

    stateUpdate.grid = columns ? { columns } : undefined;
    stateUpdate.columns = validColumns.map(({ name }) => name);
  }

  if (defaultState.rowHeight !== undefined) {
    stateUpdate.rowHeight = defaultState.rowHeight;
  }

  return Object.keys(stateUpdate).length ? stateUpdate : undefined;
};

const getDefaultState = (profilesManager: ProfilesManager, dataView: DataView) => {
  const getDefaultAppState = getMergedAccessor(
    profilesManager.getProfiles(),
    'getDefaultAppState',
    () => ({})
  );

  return getDefaultAppState({ dataView });
};
