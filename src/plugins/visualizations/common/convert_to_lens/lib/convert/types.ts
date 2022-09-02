/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { SupportedAggregation } from '../../../types';
import {
  Operation,
  BaseColumn as GenericBaseColumn,
  Column as BaseColumn,
  ColumnWithMeta as GenericColumnWithMeta,
  PercentileColumn as BasePercentileColumn,
  PercentileRanksColumn as BasePercentileRanksColumn,
  ColumnWithMeta,
} from '../../types';

import { SchemaConfig } from '../../../types';

export interface CommonColumnConverterArgs<
  Agg extends SupportedAggregation = SupportedAggregation
> {
  agg: SchemaConfig<Agg>;
  dataView: DataView;
}

export type AggId = `${SupportedAggregation}.${number}`;

export interface Meta {
  aggId: AggId;
}

export type GeneralColumn = Omit<GenericBaseColumn<Operation, unknown>, 'operationType' | 'params'>;
export type GeneralColumnWithMeta = GenericColumnWithMeta<GeneralColumn, Meta>;
export interface ExtraColumnFields {
  isBucketed?: boolean;
  isSplit?: boolean;
  reducedTimeRange?: string;
}

export type PercentileMeta = {
  reference: `${AggId}.${number}`;
} & Meta;

export type PercentileColumnWithCommonMeta = GenericColumnWithMeta<BasePercentileColumn, Meta>;
export type PercentileColumnWithExtendedMeta = GenericColumnWithMeta<
  BasePercentileColumn,
  PercentileMeta
>;
export type PercentileColumn = PercentileColumnWithCommonMeta | PercentileColumnWithExtendedMeta;

export type PercentileRanksColumnWithCommonMeta = GenericColumnWithMeta<
  BasePercentileRanksColumn,
  Meta
>;
export type PercentileRanksColumnWithExtendedMeta = GenericColumnWithMeta<
  BasePercentileRanksColumn,
  PercentileMeta
>;

export type PercentileRanksColumn =
  | PercentileRanksColumnWithCommonMeta
  | PercentileRanksColumnWithExtendedMeta;

export type CommonPercentileColumnWithExtendedMeta =
  | PercentileColumnWithExtendedMeta
  | PercentileRanksColumnWithExtendedMeta;

export type Column = ColumnWithMeta<BaseColumn, Meta>;
