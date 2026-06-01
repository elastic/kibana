/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EbtClickAttrs } from '@kbn/ebt-click';
import type { Coordinate } from '../sparkline/utils';

export type { Coordinate };

interface MetricSeries {
  value: Coordinate[];
  comparison?: Coordinate[];
}

export interface TransactionMetric {
  value: number | null;
  series?: MetricSeries;
}

export interface TransactionGroupInteraction {
  onClick?: (item: TransactionGroup) => void;
  href?: (item: TransactionGroup) => string | undefined;
}

export interface TransactionsTableHeaderAction {
  label: string;
  icon?: string;
  href?: string;
  onClick?: () => void;
  ebt: EbtClickAttrs;
}

export interface TransactionGroup {
  name: string;
  transactionType?: string;
  environment?: string;
  latency: TransactionMetric;
  throughput: TransactionMetric;
  errorRate: TransactionMetric;
  alertsCount?: number;
  impact?: {
    value: number;
    comparison?: number;
  };
}
