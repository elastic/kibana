/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Action } from '../../../../src/plugins/ui_actions/public';

export const sampleAction = (
  id: string,
  order: number,
  name: string,
  icon: string,
  grouping?: Action['grouping']
): Action => {
  return {
    id,
    type: 'SAMPLE' as any,
    order,
    getDisplayName: () => name,
    getIconType: () => icon,
    isCompatible: async () => true,
    execute: async () => {},
    grouping,
  };
};
