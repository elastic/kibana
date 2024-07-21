/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataSourceProfileProvider } from '../../../profiles';
import { DefaultAppStateColumn } from '../../../types';

export const createGetDefaultAppState =
  ({
    defaultColumns,
  }: {
    defaultColumns: DefaultAppStateColumn[];
  }): DataSourceProfileProvider['profile']['getDefaultAppState'] =>
  (prev) =>
  (params) => {
    const prevState = prev(params);
    const columns = prevState?.columns ?? [];

    if (params.dataView.isTimeBased()) {
      columns.push({ name: params.dataView.timeFieldName, width: 212 });
    }

    columns.push(...defaultColumns);

    return { columns, rowHeight: 0 };
  };
