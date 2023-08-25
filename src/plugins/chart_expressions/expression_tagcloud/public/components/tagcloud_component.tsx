/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { throttle } from 'lodash';
import { EuiIconTip, EuiResizeObserver } from '@elastic/eui';
import { IconChartTagcloud } from '@kbn/chart-icons';
import { Chart, Settings, Wordcloud, RenderChangeListener } from '@elastic/charts';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import {
  PaletteRegistry,
  PaletteOutput,
  ColorMapping,
  getColorFactory,
  SPECIAL_RULE_MATCHES,
  getPalette,
  availablePalettes,
  NeutralPalette,
} from '@kbn/coloring';
import { IInterpreterRenderHandlers, DatatableRow } from '@kbn/expressions-plugin/public';
import { getOverridesFor } from '@kbn/chart-expressions-common';
import type { AllowedSettingsOverrides, AllowedChartOverrides } from '@kbn/charts-plugin/common';
import { getColumnByAccessor, getFormatByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { isMultiFieldKey } from '@kbn/data-plugin/common';
import { getFormatService } from '../format_service';
import { TagcloudRendererConfig } from '../../common/types';
import { ScaleOptions, Orientation } from '../../common/constants';

import './tag_cloud.scss';

const MAX_TAG_COUNT = 200;

export type TagCloudChartProps = TagcloudRendererConfig & {
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: IInterpreterRenderHandlers['done'];
  palettesRegistry: PaletteRegistry;
  overrides?: AllowedSettingsOverrides & AllowedChartOverrides;
};

const calculateWeight = (value: number, x1: number, y1: number, x2: number, y2: number) =>
  ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;

const getColor = (
  palettes: PaletteRegistry,
  activePalette: PaletteOutput,
  text: string,
  values: string[],
  syncColors: boolean
) => {
  return palettes?.get(activePalette?.name)?.getCategoricalColor(
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

    const colorMappingModel: ColorMapping.Config = JSON.parse(colorMapping);
    const splitCategories = getColorCategories(visData.rows, tagColumn);
    const getColorFromMappings = getColorFactory(
      colorMappingModel,
      getPalette(availablePalettes, NeutralPalette),
      isDarkMode,
      { type: 'categories', categories: splitCategories, specialHandling: SPECIAL_RULE_MATCHES }
    );
    // TODO: configure this only for new
    const canUseColorMapping = true;

    return visData.rows.map((row) => {
      const tag = tagColumn === undefined ? 'all' : row[tagColumn];

      const category = isMultiFieldKey(tag) ? tag.keys : tag;
      return {
        text: bucketFormatter ? bucketFormatter.convert(tag, 'text') : tag,
        weight:
          tag === 'all' || visData.rows.length <= 1
            ? 1
            : calculateWeight(row[metricColumn], minValue, maxValue, 0, 1) || 0,
        color: canUseColorMapping
          ? getColorFromMappings(category)
          : getColor(palettesRegistry, palette, tag, values, syncColors) || 'rgba(0,0,0,0)',
      };
    });
  }, [
    bucket,
    bucketFormatter,
    metric,
    palette,
    palettesRegistry,
    syncColors,
    visData.columns,
    visData.rows,
    colorMapping,
    isDarkMode,
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
        // this requestAnimationFrame call is a temporary fix for https://github.com/elastic/elastic-charts/issues/2124
        window.requestAnimationFrame(() => {
          renderComplete();
        });
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

  const handleWordClick = useCallback(
    (elements) => {
      if (!bucket) {
        return;
      }
      const termsBucketId = getColumnByAccessor(bucket, visData.columns)!.id;
      const clickedValue = elements[0][0].text;

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
        <div className="tgcChart__wrapper" ref={resizeRef} data-test-subj="tagCloudVisualization">
          <Chart size="100%" {...getOverridesFor(overrides, 'chart')}>
            <Settings
              onElementClick={handleWordClick}
              onRenderChange={onRenderChange}
              ariaLabel={visParams.ariaLabel}
              ariaUseDefaultSummary={!visParams.ariaLabel}
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
            <div className="tgcChart__label" data-test-subj="tagCloudLabel">
              {label}
            </div>
          )}
          {!visParams.isPreview && warning && (
            <div className="tgcChart__warning">
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
            <div className="tgcChart__warning">
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

// TODO: export to a reusable function
export const MULTI_FIELD_VALUES_SEPARATOR = ' › ';
export function getColorCategories(rows: DatatableRow[], accessor?: string) {
  return accessor
    ? rows.reduce<{ keys: Set<string>; array: Array<string | string[]> }>(
        (acc, r) => {
          const value = r[accessor];
          if (value === undefined) {
            return acc;
          }
          const key = value.hasOwnProperty('keys') ? [...value.keys] : [value];
          const stringifiedKeys = key.join(',');
          if (!acc.keys.has(stringifiedKeys)) {
            acc.keys.add(stringifiedKeys);
            acc.array.push(key.length === 1 ? key[0] : key);
          }
          return acc;
        },
        { keys: new Set(), array: [] }
      ).array
    : [];
}
