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
import type { DiscoverAppState } from '../discover_app_state_container';
import {
  DefaultAppStateColumn,
  getMergedAccessor,
  ProfilesManager,
} from '../../../../context_awareness';
import type { InternalState } from '../discover_internal_state_container';
import type { DataDocumentsMsg } from '../discover_data_state_container';

export const getDefaultProfileState = ({
  profilesManager,
  resetDefaultProfileState,
  defaultColumns,
  dataView,
  esqlQueryColumns,
}: {
  profilesManager: ProfilesManager;
  resetDefaultProfileState: InternalState['resetDefaultProfileState'];
  defaultColumns: string[];
  dataView: DataView;
  esqlQueryColumns: DataDocumentsMsg['esqlQueryColumns'];
}) => {
  const stateUpdate: DiscoverAppState = {};
  const defaultState = getDefaultState(profilesManager, dataView);

  if (resetDefaultProfileState.columns) {
    const mappedDefaultColumns = defaultColumns.map((name) => ({ name }));
    const isValidColumn = getIsValidColumn(dataView, esqlQueryColumns);
    const validColumns = uniqBy(
      defaultState.columns?.concat(mappedDefaultColumns).filter(isValidColumn),
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

  if (resetDefaultProfileState.rowHeight && defaultState.rowHeight !== undefined) {
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

const getIsValidColumn =
  (dataView: DataView, esqlQueryColumns: DataDocumentsMsg['esqlQueryColumns']) =>
  (column: DefaultAppStateColumn) => {
    const isValid = esqlQueryColumns
      ? esqlQueryColumns.some((esqlColumn) => esqlColumn.name === column.name)
      : dataView.fields.getByName(column.name);

    return Boolean(isValid);
  };
