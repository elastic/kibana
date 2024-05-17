/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';

import type { NavigationGroupPreset } from '@kbn/core-chrome-browser';
import {
  type AnalyticsNodeDefinition,
  defaultNavigation as analytics,
} from '@kbn/default-nav-analytics';
import {
  type DevToolsNodeDefinition,
  defaultNavigation as devtools,
} from '@kbn/default-nav-devtools';
import {
  type ManagementNodeDefinition,
  defaultNavigation as management,
} from '@kbn/default-nav-management';
import { type MlNodeDefinition, defaultNavigation as ml } from '@kbn/default-nav-ml';

export function getPresets(preset: 'devtools'): DevToolsNodeDefinition;
export function getPresets(preset: 'management'): ManagementNodeDefinition;
export function getPresets(preset: 'ml'): MlNodeDefinition;
export function getPresets(preset: 'analytics'): AnalyticsNodeDefinition;
export function getPresets(preset: 'all'): {
  analytics: AnalyticsNodeDefinition;
  devtools: DevToolsNodeDefinition;
  ml: MlNodeDefinition;
  management: ManagementNodeDefinition;
};
export function getPresets(preset: NavigationGroupPreset | 'all'):
  | DevToolsNodeDefinition
  | ManagementNodeDefinition
  | MlNodeDefinition
  | AnalyticsNodeDefinition
  | {
      analytics: AnalyticsNodeDefinition;
      devtools: DevToolsNodeDefinition;
      ml: MlNodeDefinition;
      management: ManagementNodeDefinition;
    } {
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
}
