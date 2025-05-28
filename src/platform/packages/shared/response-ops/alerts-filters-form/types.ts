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
import type { alertsFiltersMetadata } from './filters';

export type AlertsFilterComponentType<T> = ComponentType<{
  value?: T;
  onChange: (newValue: T) => void;
  isDisabled?: boolean;
}>;

export interface AlertsFilter {
  type?: AlertsFiltersFormItemType;
  value?: unknown;
}

export interface AlertsFilterMetadata<T> {
  id: string;
  displayName: string;
  component: AlertsFilterComponentType<T>;
  isEmpty: (value?: T) => boolean;
}

export interface AlertsFiltersFormContextValue {
  /**
   * Pre-selected rule type ids for authorization
   */
  ruleTypeIds: string[];

  services: {
    http: HttpStart;
    notifications: NotificationsStart;
  };
}

export type AlertsFiltersFormItemType = keyof typeof alertsFiltersMetadata;

export type AlertsFiltersExpressionOperator = 'and' | 'or';

export type AlertsFiltersExpressionItem =
  | {
      operator: AlertsFiltersExpressionOperator;
    }
  | {
      filter: AlertsFilter;
    };

export type AlertsFiltersExpression = AlertsFiltersExpressionItem[];
