/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import { buildDataViewMock, deepMockedFields } from '@kbn/discover-utils/src/__mocks__';
import type { DataView } from '@kbn/data-views-plugin/public';

export const buildHitMock = (
  fields: Record<string, unknown> = {},
  customIndex: string = 'index',
  dataView: DataView = buildDataViewMock({
    name: 'data-view-mock',
    fields: deepMockedFields,
  })
) =>
  buildDataTableRecord(
    {
      _index: customIndex,
      _id: customIndex,
      _score: 1,
      _source: {},
      fields,
    },
    dataView
  );
