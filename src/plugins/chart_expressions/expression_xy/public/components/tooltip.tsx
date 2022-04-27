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
import {
  DatatablesWithFormatInfo,
  getMetaFromSeriesId,
  LayersAccessorsTitles,
  LayersFieldFormats,
} from '../helpers';

type Props = TooltipInfo & {
  fieldFormats: LayersFieldFormats;
  titles: LayersAccessorsTitles;
  formatFactory: FormatFactory;
  formattedDatatables: DatatablesWithFormatInfo;
};

interface TooltipData {
  label: string;
  value: string;
}

export const Tooltip: FC<Props> = ({
  header,
  values,
  fieldFormats,
  titles,
  formatFactory,
  formattedDatatables,
}) => {
  const pickedValue = values.find(({ isHighlighted }) => isHighlighted);

  if (!pickedValue) {
    return null;
  }

  const data: TooltipData[] = [];
  const { layerId, xAccessor } = getMetaFromSeriesId(pickedValue.seriesIdentifier.specId);
  const { formattedColumns } = formattedDatatables[layerId];

  if (header && xAccessor) {
    const possibleXFormatter = formatFactory(fieldFormats[layerId].xAccessors[xAccessor]);
    const xFormatter = formattedColumns[xAccessor] ? null : possibleXFormatter;
    data.push({
      label: titles[layerId].xTitles[xAccessor],
      value: xFormatter ? xFormatter.convert(header.value) : `${header.value}`,
    });
  }

  return <div>123</div>;
};
