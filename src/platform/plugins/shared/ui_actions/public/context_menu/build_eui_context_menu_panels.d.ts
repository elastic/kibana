/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { Trigger } from '../types';
import type { Action, ActionInternal } from '../actions';
export declare const defaultTitle: string;
export declare const txtMore: string;
export interface ActionWithContext<Context extends object = object> {
  action: Action<Context> | ActionInternal<Context>;
  context: Context;
  /**
   * Trigger that caused this action
   */
  trigger: Trigger;
}
export interface BuildContextMenuParams {
  actions: ActionWithContext[];
  title?: string;
  closeMenu?: () => void;
}
/**
 * Transforms an array of Actions to the shape EuiContextMenuPanel expects.
 */
export declare function buildContextMenuForActions({
  actions,
  title,
  closeMenu,
}: BuildContextMenuParams): Promise<EuiContextMenuPanelDescriptor[]>;
