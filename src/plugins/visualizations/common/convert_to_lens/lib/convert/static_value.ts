/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { StaticValueColumn } from '../../types';

export const createStaticValueColumn = (value: number): StaticValueColumn => ({
  operationType: 'static_value',
  columnId: uuid(),
  isBucketed: false,
  isSplit: false,
  dataType: 'number',
  references: [],
  params: {
    value: value.toString(),
  },
});
