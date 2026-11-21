/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import type { FlexPanelData } from '../panel/types';
import type { FlexLayoutData } from '../types';

export const isFlexPanelDataEqual = (a?: FlexPanelData, b?: FlexPanelData): boolean => {
  return (
    a?.id === b?.id &&
    a?.order === b?.order &&
    a?.grow === b?.grow &&
    a?.width === b?.width &&
    deepEqual(a?.resizeOptions, b?.resizeOptions)
  );
};

export const isFlexLayoutEqual = (a: FlexLayoutData, b: FlexLayoutData): boolean => {
  const panelIds = Object.keys(a);
  if (panelIds.length !== Object.keys(b).length) return false;
  return panelIds.every((panelId) => isFlexPanelDataEqual(a[panelId], b[panelId]));
};
