/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ComponentType } from 'react';
import type { alertsFilters } from './filters';

export type AlertsFilterComponentType<T> = ComponentType<{
  value?: T;
  onChange?: (newValue: T) => void;
}>;

export interface Filter {
  type?: AlertsFiltersFormItemType;
  value?: unknown;
}

export interface AlertsFiltersExpression {
  operator: 'and' | 'or';
  operands: Array<AlertsFiltersExpression | Filter>;
}

export interface AlertsFiltersFormContextValue {
  /**
   * Pre-selected rule type ids based
   */
  ruleTypeIds: string[];

  // Services
  http: HttpStart;
  notifications: NotificationsStart;
}

export type AlertsFiltersFormItemType = keyof typeof alertsFilters;

export type FlattenedExpressionItem =
  | {
      operator: AlertsFiltersExpression['operator'];
    }
  | {
      filter: Filter;
    };
