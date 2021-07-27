/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { throttle } from 'lodash';
import { EuiIconTip, EuiResizeObserver } from '@elastic/eui';
import { Chart, Settings, Wordcloud, RenderChangeListener } from '@elastic/charts';
import type { PaletteRegistry } from '../../../charts/public';
import type { IInterpreterRenderHandlers } from '../../../expressions/public';
import { getFormatService } from '../services';
import { TagCloudVisRenderValue } from '../tag_cloud_fn';

import './tag_cloud.scss';

const MAX_TAG_COUNT = 200;

export type TagCloudChartProps = TagCloudVisRenderValue & {
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: IInterpreterRenderHandlers['done'];
  palettesRegistry: PaletteRegistry;
};

const calculateWeight = (value: number, x1: number, y1: number, x2: number, y2: number) =>
  ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;

const getColor = (
  palettes: PaletteRegistry,
  activePalette: string,
  text: string,
  values: string[],
  syncColors: boolean
) => {
  return palettes?.get(activePalette).getCategoricalColor(
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
    }
  );
};

const ORIENTATIONS = {
  single: {
    endAngle: 0,
    angleCount: 360,
  },
  'right angled': {
    endAngle: 90,
    angleCount: 2,
  },
  multiple: {
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
}: TagCloudChartProps) => {
  const [warning, setWarning] = useState(false);
  const { bucket, metric, scale, palette, showLabel, orientation } = visParams;
  const bucketFormatter = bucket ? getFormatService().deserialize(bucket.format) : null;

  const tagCloudData = useMemo(() => {
    const tagColumn = bucket ? visData.columns[bucket.accessor].id : -1;
    const metricColumn = visData.columns[metric.accessor]?.id;

    const metrics = visData.rows.map((row) => row[metricColumn]);
    const values = bucket ? visData.rows.map((row) => row[tagColumn]) : [];
    const maxValue = Math.max(...metrics);
    const minValue = Math.min(...metrics);

    return visData.rows.map((row) => {
      const tag = row[tagColumn] === undefined ? 'all' : row[tagColumn];
      return {
        text: (bucketFormatter ? bucketFormatter.convert(tag, 'text') : tag) as string,
        weight:
          tag === 'all' || visData.rows.length <= 1
            ? 1
            : calculateWeight(row[metricColumn], minValue, maxValue, 0, 1) || 0,
        color: getColor(palettesRegistry, palette.name, tag, values, syncColors) || 'rgba(0,0,0,0)',
      };
    });
  }, [
    bucket,
    bucketFormatter,
    metric.accessor,
    palette.name,
    palettesRegistry,
    syncColors,
    visData.columns,
    visData.rows,
  ]);

  const label = bucket
    ? `${visData.columns[bucket.accessor].name} - ${visData.columns[metric.accessor].name}`
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

  const handleWordClick = useCallback(
    (d) => {
      if (!bucket) {
        return;
      }
      const termsBucket = visData.columns[bucket.accessor];
      const clickedValue = d[0][0].text;

      const rowIndex = visData.rows.findIndex((row) => {
        const formattedValue = bucketFormatter
          ? bucketFormatter.convert(row[termsBucket.id], 'text')
          : row[termsBucket.id];
        return formattedValue === clickedValue;
      });

      if (rowIndex < 0) {
        return;
      }

      fireEvent({
        name: 'filterBucket',
        data: {
          data: [
            {
              table: visData,
              column: bucket.accessor,
              row: rowIndex,
            },
          ],
        },
      });
    },
    [bucket, bucketFormatter, fireEvent, visData]
  );

  return (
    <EuiResizeObserver onResize={updateChart}>
      {(resizeRef) => (
        <div className="tgcChart__wrapper" ref={resizeRef} data-test-subj="tagCloudVisualization">
          <Chart size="100%">
            <Settings onElementClick={handleWordClick} onRenderChange={onRenderChange} />
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
              weightFn={scale === 'square root' ? 'squareRoot' : scale}
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
          {warning && (
            <div className="tgcChart__warning">
              <EuiIconTip
                type="alert"
                color="warning"
                content={
                  <FormattedMessage
                    id="visTypeTagCloud.feedbackMessage.tooSmallContainerDescription"
                    defaultMessage="The container is too small to display the entire cloud. Tags might be cropped or omitted."
                  />
                }
              />
            </div>
          )}
          {tagCloudData.length > MAX_TAG_COUNT && (
            <div className="tgcChart__warning">
              <EuiIconTip
                type="alert"
                color="warning"
                content={
                  <FormattedMessage
                    id="visTypeTagCloud.feedbackMessage.truncatedTagsDescription"
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

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TagCloudChart as default };
