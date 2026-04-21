/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYConfig } from '../../../schema';

type Legend = NonNullable<XYConfig['legend']>;

type StripLegendInternals<T> = Omit<T, 'visibility' | 'statistics'>;

type OutsideLegend = Extract<Legend, { placement?: 'outside' }>;
type InsideLegend = Extract<Legend, { placement: 'inside' }>;

export type InsidePosition = InsideLegend['position'];
export type InsideLayoutLegend = Omit<NonNullable<InsideLegend>, 'visibility' | 'statistics'>;

type OutsideGridLegend = Extract<
  Required<Legend>,
  { placement: 'outside'; layout: { type: 'grid' } }
>;

type OutsideLegendByPosition<P> = StripLegendInternals<Extract<OutsideLegend, { position?: P }>>;

export type HorizontalOutsideLayoutLegend = OutsideLegendByPosition<'top' | 'bottom'>;
export type VerticalOutsideLayoutLegend = OutsideLegendByPosition<'left' | 'right'>;

export type LegendStatistic = OutsideGridLegend['statistics'][number];
export type LegendSize = OutsideGridLegend['size'];
export type LegendSizeObject = Pick<OutsideGridLegend, 'size'>;
