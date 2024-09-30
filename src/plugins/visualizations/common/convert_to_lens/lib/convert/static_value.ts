/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { StaticValueColumn } from '../../types';

export const createStaticValueColumn = (value: number): StaticValueColumn => ({
  operationType: 'static_value',
  columnId: uuidv4(),
  isBucketed: false,
  isSplit: false,
  dataType: 'number',
  references: [],
  params: {
    value: value.toString(),
  },
});
