/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import { uniqBy } from 'lodash';
import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import type { DataSource } from '@kbn/data-source';
import {
  type DiscoverAppState,
  PROFILE_APP_STATE_DEFAULT_FIELDS,
  type ProfileAppStateDefaultField,
  type ProfileAppStateDefaultFields,
  type TabState,
} from '../redux';
import type { DefaultAppStateColumn, ScopedProfilesManager } from '../../../../context_awareness';
import { getMergedAccessor } from '../../../../context_awareness';

export const getProfileAppStateDefaults = ({
  scopedProfilesManager,
  profileAppStateDefaults,
  dataSource,
}: {
  scopedProfilesManager: ScopedProfilesManager;
  profileAppStateDefaults: TabState['profileAppStateDefaults'];
  dataSource: DataSource;
}) => {
  const defaultState = getDefaultState(scopedProfilesManager, dataSource);

  return {
    /**
     * Returns state that should be updated before data fetching occurs,
     * for example state used as part of the data fetching process
     * @returns The state to reset to before fetching data
     */
    getPreFetchState: () => {
      const stateUpdate: DiscoverAppState = {};

      if (
        shouldResetProfileAppStateDefaultField(profileAppStateDefaults, 'breakdownField') &&
        defaultState.breakdownField !== undefined &&
        dataSource.getColumn(defaultState.breakdownField)
      ) {
        stateUpdate.breakdownField = defaultState.breakdownField;
      }

      if (
        shouldResetProfileAppStateDefaultField(profileAppStateDefaults, 'hideChart') &&
        defaultState.hideChart !== undefined
      ) {
        stateUpdate.hideChart = defaultState.hideChart;
      }

      if (
        shouldResetProfileAppStateDefaultField(profileAppStateDefaults, 'hideTable') &&
        defaultState.hideTable !== undefined
      ) {
        stateUpdate.hideTable = defaultState.hideTable;
      }

      if (
        shouldResetProfileAppStateDefaultField(profileAppStateDefaults, 'hideSidebar') &&
        defaultState.hideSidebar !== undefined
      ) {
        stateUpdate.hideSidebar = defaultState.hideSidebar;
      }

      return Object.keys(stateUpdate).length ? stateUpdate : undefined;
    },

    /**
     * Returns state that should be updated after data fetching occurs,
     * for example state used to modify the UI after receiving data
     * @returns The state to reset to after fetching data
     */
    getPostFetchState: ({
      defaultColumns,
      dataSource: postFetchDataSource = dataSource,
    }: {
      defaultColumns: string[];
      dataSource?: DataSource;
    }) => {
      const stateUpdate: DiscoverAppState = {};

      if (shouldResetProfileAppStateDefaultField(profileAppStateDefaults, 'columns')) {
        const mappedDefaultColumns = defaultColumns.map((name) => ({ name }));
        const isValidColumn = getIsValidColumn(postFetchDataSource);
        const validColumns = uniqBy(
          (defaultState.columns ?? []).concat(mappedDefaultColumns).filter(isValidColumn),
          'name'
        );

        if (validColumns?.length) {
          const hasAutoWidthColumn = validColumns.some(({ width }) => !width);
          const columns = validColumns.reduce<DiscoverGridSettings['columns']>(
            (acc, { name, width }, index) => {
              // Ensure there's at least one auto width column so the columns fill the grid
              const skipColumnWidth = !hasAutoWidthColumn && index === validColumns.length - 1;
              return width && !skipColumnWidth ? { ...acc, [name]: { width } } : acc;
            },
            undefined
          );

          stateUpdate.grid = columns ? { columns } : undefined;
          stateUpdate.columns = validColumns.map(({ name }) => name);
        }
      }

      if (
        shouldResetProfileAppStateDefaultField(profileAppStateDefaults, 'rowHeight') &&
        defaultState.rowHeight !== undefined
      ) {
        stateUpdate.rowHeight = defaultState.rowHeight;
      }

      return Object.keys(stateUpdate).length ? stateUpdate : undefined;
    },
  };
};

export const getFieldsToReset = (
  shouldResetByField: Record<ProfileAppStateDefaultField, boolean>
): ProfileAppStateDefaultFields => {
  const fields = PROFILE_APP_STATE_DEFAULT_FIELDS.filter((field) => shouldResetByField[field]);

  if (fields.length === 0) {
    return 'none';
  }

  if (fields.length === PROFILE_APP_STATE_DEFAULT_FIELDS.length) {
    return 'all';
  }

  const [firstField, ...restFields] = fields;

  return [firstField, ...restFields];
};

const getDefaultState = (scopedProfilesManager: ScopedProfilesManager, dataSource: DataSource) => {
  const getDefaultAppState = getMergedAccessor(
    scopedProfilesManager.getProfiles(),
    'getDefaultAppState',
    () => ({})
  );

  return getDefaultAppState({ dataView: toProfileDataView(dataSource) });
};

export const shouldResetProfileAppStateDefaultField = (
  profileAppStateDefaults: TabState['profileAppStateDefaults'],
  field: ProfileAppStateDefaultField
) =>
  profileAppStateDefaults.fieldsToReset === 'all' ||
  (profileAppStateDefaults.fieldsToReset !== 'none' &&
    profileAppStateDefaults.fieldsToReset.includes(field));

const getIsValidColumn = (dataSource: DataSource) => (column: DefaultAppStateColumn) => {
  // Summary is a synthetic column; allow it even when absent from the source
  if (column.name === SOURCE_COLUMN) {
    return true;
  }

  return Boolean(dataSource.getColumn(column.name));
};

/**
 * `getDefaultAppState` still takes a DataView. DataViewSource already wraps one;
 * EsqlSource only needs time-field identity for current profile accessors.
 */
const toProfileDataView = (dataSource: DataSource): DataView => {
  if (dataSource.kind === 'index-pattern') {
    return dataSource.getDataView();
  }

  return {
    isTimeBased: () => dataSource.isTimeBased(),
    timeFieldName: dataSource.timeFieldName,
    getIndexPattern: () => dataSource.title,
  } as DataView;
};
