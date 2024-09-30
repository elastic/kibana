/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CellValueContext,
  ValueClickContext,
  MultiValueClickContext,
} from '@kbn/embeddable-plugin/public';
import { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import {
  Plugin as ExpressionsPublicPlugin,
  ExpressionsServiceStart,
} from '@kbn/expressions-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

export type ExpressionPartitionVisPluginSetup = void;
export type ExpressionPartitionVisPluginStart = void;

export interface SetupDeps {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  charts: ChartsPluginSetup;
}

export interface StartDeps {
  expression: ExpressionsServiceStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  usageCollection?: UsageCollectionStart;
}

export interface FilterEvent {
  name: 'filter';
  data: ValueClickContext['data'];
}

export interface MultiFilterEvent {
  name: 'multiFilter';
  data: MultiValueClickContext['data'];
}

export interface CellValueAction {
  id: string;
  type?: string;
  iconType: string;
  displayName: string;
  execute: (data: CellValueContext['data']) => void;
}

export type ColumnCellValueActions = CellValueAction[][];

export type GetCompatibleCellValueActions = (
  data: CellValueContext['data']
) => Promise<CellValueAction[]>;
