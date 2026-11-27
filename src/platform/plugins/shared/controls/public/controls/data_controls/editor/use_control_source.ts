/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import type { DataControlState } from '@kbn/controls-schemas';
import type { FilterableSource } from '@kbn/data-source';
import type { DataView } from '@kbn/data-views-plugin/common';
import { coreServices } from '../../../services/kibana_services';
import {
  isSameControlSource,
  resolveControlSource,
  toControlSourceDescriptor,
} from '../../utils/control_source';

interface ControlSource {
  source?: FilterableSource;
  /** The data view of a field control, which its field picker lists the fields of */
  dataView?: DataView;
  loading: boolean;
  error?: Error;
}

/** The source of the control being edited, resolved only when `enabled`. */
export const useControlSource = ({
  state: { values_source: valuesSource, data_view_id: dataViewId, esql_query: esqlQuery },
  enabled,
  parentApi,
}: {
  state: Partial<Pick<DataControlState, 'values_source' | 'data_view_id' | 'esql_query'>>;
  enabled: boolean;
  parentApi?: unknown;
}): ControlSource => {
  const descriptor = useMemo(
    () =>
      enabled
        ? toControlSourceDescriptor({
            values_source: valuesSource,
            data_view_id: dataViewId,
            esql_query: esqlQuery,
          })
        : undefined,
    [enabled, valuesSource, dataViewId, esqlQuery]
  );

  const {
    loading,
    value: resolved,
    error,
  } = useAsync(async () => {
    if (!descriptor) return;
    const dataSource = await resolveControlSource(descriptor, { parentApi });
    const source = await dataSource.toFilterableSource(coreServices.http);
    return { descriptor, dataSource, source };
  }, [descriptor]);

  // the source of the previous descriptor is still returned for one render after it changes
  if (!resolved || !descriptor || !isSameControlSource(resolved.descriptor, descriptor)) {
    return { loading, error };
  }
  const { dataSource, source } = resolved;
  return {
    source,
    dataView: dataSource.kind === 'index-pattern' ? dataSource.getDataView() : undefined,
    loading,
    error,
  };
};
