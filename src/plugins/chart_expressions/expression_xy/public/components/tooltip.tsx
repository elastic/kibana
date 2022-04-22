/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TooltipInfo } from '@elastic/charts';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import React, { FC } from 'react';

export type AccessorsFormatters = Record<string, FieldFormat>;

export interface LayerFormatters {
  xAccessors: AccessorsFormatters;
  yAccessors: AccessorsFormatters;
  splitSeriesAccessors: AccessorsFormatters;
  splitColumnAccessors: AccessorsFormatters;
  splitRowAccessors: AccessorsFormatters;
}

export type LayersFormatters = Record<string, LayerFormatters>;

type Props = TooltipInfo & {
  formatters: LayersFormatters;
};

export const Tooltip: FC<Props> = ({ header, values, formatters }) => {
  return <div>123</div>;
};
