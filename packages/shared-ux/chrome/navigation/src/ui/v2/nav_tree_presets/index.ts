/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { NavigationGroupPreset, NodeDefinition } from '../types';
import { analytics, type ID as AnalyticsID } from './analytics';
import { devtools, type ID as DevtoolsID } from './devtools';
import { management, type ID as ManagementID } from './management';
import { ml, type ID as MlID } from './ml';

export { analytics } from './analytics';
export { devtools } from './devtools';
export { ml } from './ml';
export { management } from './management';

export type NodeDefinitionWithChildren<ID extends string = string> = NodeDefinition<ID> & {
  children: Required<NodeDefinition<ID>>['children'];
};

export function getPresets(preset: 'devtools'): NodeDefinitionWithChildren<DevtoolsID>;
export function getPresets(preset: 'management'): NodeDefinitionWithChildren<ManagementID>;
export function getPresets(preset: 'ml'): NodeDefinitionWithChildren<MlID>;
export function getPresets(preset: 'analytics'): NodeDefinitionWithChildren<AnalyticsID>;
export function getPresets(preset: 'all'): {
  analytics: NodeDefinitionWithChildren<AnalyticsID>;
  devtools: NodeDefinitionWithChildren<DevtoolsID>;
  ml: NodeDefinitionWithChildren<MlID>;
  management: NodeDefinitionWithChildren<ManagementID>;
};
export function getPresets(preset: NavigationGroupPreset | 'all'):
  | NodeDefinitionWithChildren<DevtoolsID>
  | NodeDefinitionWithChildren<ManagementID>
  | NodeDefinitionWithChildren<MlID>
  | NodeDefinitionWithChildren<AnalyticsID>
  | {
      analytics: NodeDefinitionWithChildren<AnalyticsID>;
      devtools: NodeDefinitionWithChildren<DevtoolsID>;
      ml: NodeDefinitionWithChildren<MlID>;
      management: NodeDefinitionWithChildren<ManagementID>;
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
