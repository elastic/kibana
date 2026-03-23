/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';

export async function prepareDataViewForEditing(
  dataView: DataView,
  dataViewsService: DataViewsServicePublic
) {
  if (dataView.isPersisted()) {
    return dataView;
  }

  // Creating a "clean" copy of the data view to avoid side effects
  const dataViewClone = await dataViewsService.create(
    {
      ...dataView.toSpec(),
      id: uuidv4(),
    },
    true
  );
  return dataViewClone;
}
