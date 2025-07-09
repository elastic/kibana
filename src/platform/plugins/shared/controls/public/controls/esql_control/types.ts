/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType, PublishesESQLVariable } from '@kbn/esql-types';
import type { HasEditCapabilities, PublishesTitle } from '@kbn/presentation-publishing';
import type { DefaultControlApi } from '../types';

export type ESQLControlApi = DefaultControlApi &
  PublishesESQLVariable &
  HasEditCapabilities &
  Pick<PublishesTitle, 'defaultTitle$'>;

/**
 * Types of ES|QL controls
 * - STATIC_VALUES: Static values that are not dependent on any query
 * - VALUES_FROM_QUERY: Values that are dependent on an ES|QL query
 */
export enum EsqlControlType {
  STATIC_VALUES = 'STATIC_VALUES',
  VALUES_FROM_QUERY = 'VALUES_FROM_QUERY',
}

export interface ESQLControlVariable {
  key: string;
  value: string | number;
  type: ESQLVariableType;
}

export type ControlWidthOptions = 'small' | 'medium' | 'large';

export interface ESQLControlState {
  grow?: boolean;
  width?: ControlWidthOptions;
  title: string;
  availableOptions: string[];
  selectedOptions: string[];
  variableName: string;
  variableType: ESQLVariableType;
  esqlQuery: string;
  controlType: EsqlControlType;
}
