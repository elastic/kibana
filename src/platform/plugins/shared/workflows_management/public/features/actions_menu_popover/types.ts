/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';

interface ActionBase {
  id: string;
  label: string;
  description?: string;
  instancesLabel?: string;
  iconColor?: string;
}

export interface ActionGroup extends ActionBase {
  iconType: IconType;
  options: ActionOptionData[];
}

export interface ActionConnectorGroup extends ActionBase {
  connectorType: string;
  options: ActionOptionData[];
}

export interface ActionOption extends ActionBase {
  id: string;
  iconType: IconType;
}

export interface ActionConnectorOption extends ActionBase {
  connectorType: string;
}

export type ActionOptionData =
  | ActionOption
  | ActionGroup
  | ActionConnectorGroup
  | ActionConnectorOption;

export function isActionGroup(option: ActionOptionData): option is ActionGroup {
  return 'options' in option;
}

export function isActionConnectorGroup(option: ActionOptionData): option is ActionConnectorGroup {
  return 'connectorType' in option && 'options' in option;
}

export function isActionConnectorOption(option: ActionOptionData): option is ActionConnectorOption {
  return 'connectorType' in option && !('options' in option);
}

export function isActionOption(option: ActionOptionData): option is ActionOption {
  return !('options' in option);
}
