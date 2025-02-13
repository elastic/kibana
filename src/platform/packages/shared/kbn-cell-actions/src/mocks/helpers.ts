/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import type { CellActionExecutionContext } from '../types';

export const makeAction = (actionsName: string, icon: string = 'icon', order?: number) => ({
  id: actionsName,
  type: actionsName,
  order,
  getIconType: () => icon,
  getDisplayName: () => actionsName,
  getDisplayNameTooltip: () => actionsName,
  isCompatible: () => Promise.resolve(true),
  execute: () => {
    alert(actionsName);
    return Promise.resolve();
  },
});

export const makeActionContext = (
  override: Partial<CellActionExecutionContext> = {}
): CellActionExecutionContext => ({
  trigger: { id: 'triggerId' },
  data: [
    {
      field: {
        name: 'fieldName',
        type: 'keyword',
        searchable: true,
        aggregatable: true,
      },
      value: 'some value',
    },
  ],
  nodeRef: {} as MutableRefObject<HTMLElement>,
  metadata: { dataViewId: 'mockDataViewId' },
  ...override,
});
