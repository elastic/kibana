/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TooltipInfo } from '@elastic/charts';
import { FormatFactory } from '@kbn/field-formats-plugin/common';
import React, { FC } from 'react';
import { LayersAccessorsTitles, LayersFieldFormats } from '../helpers';

type Props = TooltipInfo & {
  fieldFormats: LayersFieldFormats;
  titles: LayersAccessorsTitles;
  formatFactory: FormatFactory;
};

export const Tooltip: FC<Props> = ({ header, values, fieldFormats, titles, formatFactory }) => {
  return <div>123</div>;
};
