/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { throttle } from 'lodash';
import { EuiIconTip, EuiResizeObserver, UseEuiTheme } from '@elastic/eui';
import { IconChartTagcloud } from '@kbn/chart-icons';
import {
  Chart,
  Settings,
  Wordcloud,
  RenderChangeListener,
  LEGACY_LIGHT_THEME,
  ElementClickListener,
  WordCloudElementEvent,
} from '@elastic/charts';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { PaletteRegistry, PaletteOutput, getColorFactory } from '@kbn/coloring';
import { IInterpreterRenderHandlers, DatatableRow } from '@kbn/expressions-plugin/public';
import { getColorCategories, getOverridesFor } from '@kbn/chart-expressions-common';
import type { AllowedSettingsOverrides, AllowedChartOverrides } from '@kbn/charts-plugin/common';
import { getColumnByAccessor, getFormatByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { isMultiFieldKey } from '@kbn/data-plugin/common';
import { KbnPalettes, useKbnPalettes } from '@kbn/palettes';
import { css } from '@emotion/react';
import { getFormatService } from '../format_service';
import { TagcloudRendererConfig } from '../../common/types';
import { ScaleOptions, Orientation } from '../../common/constants';

const MAX_TAG_COUNT = 200;

export type TagCloudChartProps = TagcloudRendererConfig & {
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: IInterpreterRenderHandlers['done'];
  palettesRegistry: PaletteRegistry;
  overrides?: AllowedSettingsOverrides & AllowedChartOverrides;
  isDarkMode: boolean;
};

const calculateWeight = (value: number, x1: number, y1: number, x2: number, y2: number) =>
  ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;

const getColor = (
  paletteService: PaletteRegistry,
  activePalette: PaletteOutput,
  text: string,
  values: string[],
  syncColors: boolean
) => {
  return paletteService?.get(activePalette?.name)?.getCategoricalColor(
    [
      {
        name: text,
        rankAtDepth: values.length ? values.findIndex((name) => name === text) : 0,
        totalSeriesAtDepth: values.length || 1,
      },
    ],
    {
      maxDepth: 1,
      totalSeries: values.length || 1,
      behindText: false,
      syncColors,
    },
    activePalette?.params ?? { colors: [] }
  );
};

const ORIENTATIONS = {
  [Orientation.SINGLE]: {
    endAngle: 0,
    angleCount: 360,
  },
  [Orientation.RIGHT_ANGLED]: {
    endAngle: 90,
    angleCount: 2,
  },
  [Orientation.MULTIPLE]: {
    endAngle: -90,
    angleCount: 12,
  },
};

export const TagCloudChart = ({
  visData,
  visParams,
  palettesRegistry,
  fireEvent,
  renderComplete,
  syncColors,
  overrides,
  isDarkMode,
}: TagCloudChartProps) => {
  const [warning, setWarning] = useState(false);
  const palettes = useKbnPalettes();
  const { bucket, metric, scale, palette, showLabel, orientation, colorMapping } = visParams;

  const bucketFormatter = useMemo(() => {
    return bucket
      ? getFormatService().deserialize(getFormatByAccessor(bucket, visData.columns))
      : null;
  }, [bucket, visData.columns]);

  const tagCloudData = useMemo(() => {
    const bucketColumn = bucket ? getColumnByAccessor(bucket, visData.columns)! : null;
    const tagColumn = bucket ? bucketColumn!.id : undefined;
    const metricColumn = getColumnByAccessor(metric, visData.columns)!.id;

    const metrics = visData.rows.map((row) => row[metricColumn]);
    const values =
      bucket && tagColumn !== undefined ? visData.rows.map((row) => row[tagColumn]) : [];
    const maxValue = Math.max(...metrics);
    const minValue = Math.min(...metrics);

    const colorFromMappingFn = getColorFromMappingFactory(
      tagColumn,
      visData.rows,
      palettes,
      isDarkMode,
      colorMapping
    );

    return visData.rows.map((row) => {
      const tag = tagColumn === undefined ? 'all' : row[tagColumn];

      const category = isMultiFieldKey(tag) ? tag.keys.map(String) : `${tag}`;
      return {
        text: bucketFormatter ? bucketFormatter.convert(tag, 'text') : tag,
        weight:
          tag === 'all' || visData.rows.length <= 1
            ? 1
            : calculateWeight(row[metricColumn], minValue, maxValue, 0, 1) || 0,
        color: colorFromMappingFn
          ? colorFromMappingFn(category)
          : getColor(palettesRegistry, palette, tag, values, syncColors) || 'rgba(0,0,0,0)',
      };
    });
  }, [
    bucket,
    visData.columns,
    visData.rows,
    metric,
    palettes,
    isDarkMode,
    colorMapping,
    bucketFormatter,
    palettesRegistry,
    palette,
    syncColors,
  ]);

  useEffect(() => {
    // clear warning when data changes
    if (warning) {
      setWarning(false);
    }
    // "warning" excluded from dependencies.
    // Clear warning when "tagCloudData" changes. Do not clear warning when "warning" changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagCloudData]);

  const label = bucket
    ? `${getColumnByAccessor(bucket, visData.columns)!.name} - ${
        getColumnByAccessor(metric, visData.columns)!.name
      }`
    : '';

  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
      if (isRendered) {
        renderComplete();
      }
    },
    [renderComplete]
  );

  const updateChart = useMemo(
    () =>
      throttle(() => {
        setWarning(false);
      }, 300),
    []
  );

  const handleWordClick = useCallback<ElementClickListener>(
    (elements) => {
      if (!bucket) {
        return;
      }
      const termsBucketId = getColumnByAccessor(bucket, visData.columns)!.id;
      const clickedValue = (elements[0] as WordCloudElementEvent)[0].text;

      const columnIndex = visData.columns.findIndex((col) => col.id === termsBucketId);
      if (columnIndex < 0) {
        return;
      }

      const rowIndex = visData.rows.findIndex((row) => {
        const formattedValue = bucketFormatter
          ? bucketFormatter.convert(row[termsBucketId], 'text')
          : row[termsBucketId];
        return formattedValue === clickedValue;
      });

      if (rowIndex < 0) {
        return;
      }

      fireEvent({
        name: 'filter',
        data: {
          data: [
            {
              table: visData,
              column: columnIndex,
              row: rowIndex,
            },
          ],
        },
      });
    },
    [bucket, bucketFormatter, fireEvent, visData]
  );

  if (visData.rows.length === 0) {
    return <EmptyPlaceholder icon={IconChartTagcloud} renderComplete={renderComplete} />;
  }

  return (
    <EuiResizeObserver onResize={updateChart}>
      {(resizeRef) => (
        <div css={tgcChartCss.wrapper} ref={resizeRef} data-test-subj="tagCloudVisualization">
          <Chart size="100%" {...getOverridesFor(overrides, 'chart')}>
            <Settings
              // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
              baseTheme={LEGACY_LIGHT_THEME}
              onElementClick={handleWordClick}
              onRenderChange={onRenderChange}
              ariaLabel={visParams.ariaLabel}
              ariaUseDefaultSummary={!visParams.ariaLabel}
              locale={i18n.getLocale()}
              {...getOverridesFor(overrides, 'settings')}
            />
            <Wordcloud
              id="tagCloud"
              startAngle={0}
              endAngle={ORIENTATIONS[orientation].endAngle}
              angleCount={ORIENTATIONS[orientation].angleCount}
              padding={5}
              fontWeight={400}
              fontFamily="Inter UI, sans-serif"
              fontStyle="normal"
              minFontSize={visParams.minFontSize}
              maxFontSize={visParams.maxFontSize}
              spiral="archimedean"
              data={tagCloudData}
              weightFn={scale === ScaleOptions.SQUARE_ROOT ? 'squareRoot' : scale}
              outOfRoomCallback={() => {
                setWarning(true);
              }}
            />
          </Chart>
          {label && showLabel && (
            <div css={tgcChartCss.label} data-test-subj="tagCloudLabel">
              {label}
            </div>
          )}
          {!visParams.isPreview && warning && (
            <div css={tgcChartCss.warning}>
              <EuiIconTip
                type="warning"
                color="warning"
                content={
                  <FormattedMessage
                    id="expressionTagcloud.feedbackMessage.tooSmallContainerDescription"
                    defaultMessage="The container is too small to display the entire cloud. Tags might be cropped or omitted."
                  />
                }
              />
            </div>
          )}
          {!visParams.isPreview && tagCloudData.length > MAX_TAG_COUNT && (
            <div css={tgcChartCss.warning}>
              <EuiIconTip
                type="warning"
                color="warning"
                content={
                  <FormattedMessage
                    id="expressionTagcloud.feedbackMessage.truncatedTagsDescription"
                    defaultMessage="The number of tags has been truncated to avoid long draw times."
                  />
                }
              />
            </div>
          )}
        </div>
      )}
    </EuiResizeObserver>
  );
};

// eslint-disable-next-line import/no-default-export
export { TagCloudChart as default };

/**
 * If colorMapping is available, returns a function that accept a string or an array of strings (used in case of multi-field-key)
 * and returns a color specified in the provided mapping
 */
function getColorFromMappingFactory(
  tagColumn: string | undefined,
  rows: DatatableRow[],
  palettes: KbnPalettes,
  isDarkMode: boolean,
  colorMapping?: string
): undefined | ((category: string | string[]) => string) {
  if (!colorMapping) {
    // return undefined, we will use the legacy color mapping instead
    return undefined;
  }
  return getColorFactory(JSON.parse(colorMapping), palettes, isDarkMode, {
    type: 'categories',
    categories: getColorCategories(rows, tagColumn),
  });
}

const tgcChartCss = {
  wrapper: css({
    flex: '1 1 0',
    display: 'flex',
    flexDirection: 'column',
    // it is used for rendering at `Canvas`.
    height: '100%',
    '& text': {
      cursor: 'pointer',
    },
  }),
  label: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      textAlign: 'center',
      fontWeight: euiTheme.font.weight.bold,
    }),
  warning: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: euiTheme.size.base,
    }),
};
