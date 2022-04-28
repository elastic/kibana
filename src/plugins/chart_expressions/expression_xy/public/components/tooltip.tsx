/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TooltipInfo, XYChartSeriesIdentifier } from '@elastic/charts';
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
  splitAccessors?: {
    splitRowAccessor?: string;
    splitColumnAccessor?: string;
  };
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
  splitAccessors,
}) => {
  const pickedValue = values.find(({ isHighlighted }) => isHighlighted);

  if (!pickedValue) {
    return null;
  }

  const data: TooltipData[] = [];
  const seriesIdentifier = pickedValue.seriesIdentifier as XYChartSeriesIdentifier;
  const { layerId, xAccessor, yAccessor } = getMetaFromSeriesId(seriesIdentifier.specId);
  const { formattedColumns } = formattedDatatables[layerId];
  const layerTitles = titles[layerId];
  const layerFormats = fieldFormats[layerId];

  if (header && xAccessor) {
    const xFormatter = formattedColumns[xAccessor]
      ? null
      : formatFactory(layerFormats.xAccessors[xAccessor]);
    data.push({
      label: layerTitles.xTitles[xAccessor],
      value: xFormatter ? xFormatter.convert(header.value) : `${header.value}`,
    });
  }

  const tooltipYAccessor = yAccessor === seriesIdentifier.yAccessor ? yAccessor : null;
  if (tooltipYAccessor) {
    const yFormatter = formatFactory(layerFormats.yAccessors[tooltipYAccessor]);
    data.push({
      label: layerTitles.yTitles[tooltipYAccessor],
      value: yFormatter ? yFormatter.convert(pickedValue.value) : `${pickedValue.value}`,
    });
  }
  seriesIdentifier.splitAccessors.forEach((splitValue, key) => {
    const splitSeriesFormatter = formattedColumns[key]
      ? null
      : formatFactory(layerFormats.splitSeriesAccessors[key]);

    const label = layerTitles.splitSeriesTitles[key];
    const value = splitSeriesFormatter ? splitSeriesFormatter.convert(splitValue) : `${splitValue}`;
    data.push({ label, value });
  });

  if (
    splitAccessors?.splitColumnAccessor &&
    seriesIdentifier.smVerticalAccessorValue !== undefined
  ) {
    data.push({
      label: layerTitles.splitColumnTitles[splitAccessors?.splitColumnAccessor],
      value: `${seriesIdentifier.smVerticalAccessorValue}`,
    });
  }

  if (
    splitAccessors?.splitRowAccessor &&
    seriesIdentifier.smHorizontalAccessorValue !== undefined
  ) {
    data.push({
      label: layerTitles.splitRowTitles[splitAccessors?.splitRowAccessor],
      value: `${seriesIdentifier.smHorizontalAccessorValue}`,
    });
  }

  return <div>123</div>;
};
