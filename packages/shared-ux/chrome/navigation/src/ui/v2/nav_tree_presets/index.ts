/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { NavigationBucketPreset } from '../types';
import { analytics } from './analytics';
import { devtools } from './devtools';
import { management } from './management';
import { ml } from './ml';

export { analytics } from './analytics';
export { devtools } from './devtools';
export { ml } from './ml';
export { management } from './management';

export const getPresets = (preset: NavigationBucketPreset | 'all') => {
  if (preset === 'all') {
    return {
      analytics: cloneDeep(analytics),
      devtools: cloneDeep(devtools),
      ml: cloneDeep(ml),
      management: cloneDeep(management),
    };
  }

  switch (preset) {
    case 'analytics':
      return cloneDeep(analytics);
    case 'devtools':
      return cloneDeep(devtools);
    case 'ml':
      return cloneDeep(ml);
    case 'management':
      return cloneDeep(management);
    default:
      throw new Error(`Unknown preset: ${preset}`);
  }
};
