/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { DataView, DataViewSpec, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { RootProfileState } from '../context_awareness';
import type { InlineDataViewService } from '../services/inline_data_view_service';
import { useDiscoverServices } from './use_discover_services';

type LoadedRootProfileState = Extract<RootProfileState, { rootProfileLoading: false }>;

const loadDataView = ({
  dataViews,
  inlineDataViews,
  index,
  rootProfileState,
}: {
  dataViews: DataViewsContract;
  inlineDataViews: InlineDataViewService;
  index: string | DataViewSpec;
  rootProfileState: LoadedRootProfileState;
}): Promise<DataView> => {
  if (typeof index === 'object') {
    return inlineDataViews.resolve(index);
  }

  // Default profile ad hoc data views (e.g. "All logs") are not persisted and their spec
  // is only passed through the history state, so fall back to the root profile spec
  // when only the ID is available (e.g. after a full page reload)
  const profileDataViewSpec = rootProfileState
    .getDefaultAdHocDataViews()
    .find(({ id }) => id === index);

  if (profileDataViewSpec) {
    return dataViews.create({ ...profileDataViewSpec, managed: true });
  }

  return dataViews.get(index);
};

/** Loads a view by ID or resolves an inline spec once the root profile is available. */
export const useDataView = ({
  index,
  rootProfileState,
}: {
  index: string | DataViewSpec;
  rootProfileState: RootProfileState;
}) => {
  const { dataViews, inlineDataViews } = useDiscoverServices();
  const [dataView, setDataView] = useState<DataView>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    if (rootProfileState.rootProfileLoading) {
      return;
    }

    loadDataView({ dataViews, inlineDataViews, index, rootProfileState })
      .then(setDataView)
      .catch(setError);
  }, [dataViews, inlineDataViews, index, rootProfileState]);

  return { dataView, error };
};
