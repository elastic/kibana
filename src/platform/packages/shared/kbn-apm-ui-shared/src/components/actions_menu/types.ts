/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EbtClickAttrs } from '@kbn/ebt-click';

export interface ActionBase {
  id: string;
  name: string;
  onClick?: () => void;
  href?: string;
  icon?: string;
  ebt: EbtClickAttrs;
}

export type ActionSubItem = ActionBase;

export interface Action extends ActionBase {
  items?: ActionSubItem[];
}

export interface ActionGroup {
  id: string;
  groupLabel?: string;
  actions: Action[];
}

export type ActionGroups = ActionGroup[];
