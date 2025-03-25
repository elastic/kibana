/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TooltipInfo, XYChartSeriesIdentifier } from '@elastic/charts';
import { FormatFactory } from '@kbn/field-formats-plugin/common';
import { getAccessorByDimension } from '@kbn/visualizations-plugin/common/utils';
import React, { FC } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
// @ts-expect-error style types not defined
import { euiToolTipStyles } from '@elastic/eui/lib/components/tool_tip/tool_tip.styles';

import { CommonXYDataLayerConfig } from '../../../common';
import {
  DatatablesWithFormatInfo,
  getMetaFromSeriesId,
  LayersAccessorsTitles,
  LayersFieldFormats,
} from '../../helpers';
import { XDomain } from '../x_domain';
import { EndzoneTooltipHeader } from './endzone_tooltip_header';
import { TooltipData, TooltipRow } from './tooltip_row';
import { isEndzoneBucket } from './utils';

type Props = TooltipInfo & {
  xDomain?: XDomain;
  fieldFormats: LayersFieldFormats;
  titles?: LayersAccessorsTitles;
  formatFactory: FormatFactory;
  formattedDatatables: DatatablesWithFormatInfo;
  splitAccessors?: {
    splitRowAccessor?: string;
    splitColumnAccessor?: string;
  };
  layers: CommonXYDataLayerConfig[];
};

export const Tooltip: FC<Props> = ({
  header,
  values,
  fieldFormats,
  titles = {},
  formatFactory,
  formattedDatatables,
  splitAccessors,
  xDomain,
  layers,
}) => {
  const pickedValue = values.find(({ isHighlighted }) => isHighlighted);

  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const toolTipStyles = euiToolTipStyles(euiThemeContext).euiToolTip;

  const customToolTipStyles = css`
    pointer-events: none;
    // Override position absolute from toolTipStyles
    position: relative;

    & {
      // stylelint-disable-line no-duplicate-selectors
      max-width: calc(${euiTheme.size.xl} * 10);
      overflow: hidden;
      padding: ${euiTheme.size.s};
    }

    table {
      table-layout: fixed;
      width: 100%;

      td,
      th {
        text-align: left;
        padding: ${euiTheme.size.xs};
        overflow-wrap: break-word;
      }
    }
  `;

  if (!pickedValue) {
    return null;
  }

  const data: TooltipData[] = [];
  const seriesIdentifier = pickedValue.seriesIdentifier as XYChartSeriesIdentifier;
  const { layerId, xAccessor, yAccessors } = getMetaFromSeriesId(seriesIdentifier.specId);
  const { formattedColumns, table } = formattedDatatables[layerId];
  const layerTitles = titles[layerId];
  const layerFormats = fieldFormats[layerId];
  const markSizeAccessor = layers.find((layer) => layer.layerId === layerId)?.markSizeAccessor;
  const markSizeColumnId = markSizeAccessor
    ? getAccessorByDimension(markSizeAccessor, table.columns)
    : undefined;
  let headerFormatter;
  if (header && xAccessor) {
    headerFormatter = formattedColumns[xAccessor]
      ? null
      : formatFactory(layerFormats.xAccessors[xAccessor]);
    data.push({
      label: layerTitles?.xTitles?.[xAccessor],
      value: headerFormatter ? headerFormatter.convert(header.value) : `${header.value}`,
    });
  }

  const tooltipYAccessor = yAccessors.includes(seriesIdentifier.yAccessor as string)
    ? (seriesIdentifier.yAccessor as string)
    : null;
  if (tooltipYAccessor) {
    const yFormatter = formatFactory(layerFormats.yAccessors[tooltipYAccessor]);
    data.push({
      label: layerTitles?.yTitles?.[tooltipYAccessor],
      value: yFormatter ? yFormatter.convert(pickedValue.value) : `${pickedValue.value}`,
    });
  }
  if (markSizeColumnId && pickedValue.formattedMarkValue) {
    data.push({
      label: layerTitles?.markSizeTitles?.[markSizeColumnId],
      value: pickedValue.formattedMarkValue,
    });
  }
  seriesIdentifier.splitAccessors.forEach((splitValue, key) => {
    const splitSeriesFormatter = formattedColumns[key]
      ? null
      : layerFormats.splitSeriesAccessors[key].formatter;

    const label = layerTitles?.splitSeriesTitles?.[key];
    const value = splitSeriesFormatter ? splitSeriesFormatter.convert(splitValue) : `${splitValue}`;
    data.push({ label, value });
  });

  if (
    splitAccessors?.splitColumnAccessor &&
    seriesIdentifier.smHorizontalAccessorValue !== undefined
  ) {
    data.push({
      label: layerTitles?.splitColumnTitles?.[splitAccessors?.splitColumnAccessor],
      value: `${seriesIdentifier.smHorizontalAccessorValue}`,
    });
  }

  if (splitAccessors?.splitRowAccessor && seriesIdentifier.smVerticalAccessorValue !== undefined) {
    data.push({
      label: layerTitles?.splitRowTitles?.[splitAccessors?.splitRowAccessor],
      value: `${seriesIdentifier.smVerticalAccessorValue}`,
    });
  }

  const tooltipRows = data.map((tooltipRow, index) => (
    <TooltipRow {...tooltipRow} key={`${tooltipRow.label}-${tooltipRow.value}-${index}`} />
  ));

  const renderEndzoneTooltip = header ? isEndzoneBucket(header?.value, xDomain) : false;

  return (
    <div css={[toolTipStyles, customToolTipStyles]}>
      {renderEndzoneTooltip && (
        <div
          css={css`
            > :last-child {
              margin-bottom: ${euiTheme.size.s};
            }
          `}
        >
          <EndzoneTooltipHeader />
        </div>
      )}
      <table>
        <tbody>{tooltipRows}</tbody>
      </table>
    </div>
  );
};
