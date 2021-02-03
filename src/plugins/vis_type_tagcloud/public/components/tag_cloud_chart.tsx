/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { EuiResizeObserver } from '@elastic/eui';
import { throttle } from 'lodash';

import { TagCloudVisDependencies } from '../plugin';
import { TagCloudVisRenderValue } from '../tag_cloud_fn';
// @ts-ignore
import { TagCloudVisualization } from './tag_cloud_visualization';

import './tag_cloud.scss';

type TagCloudChartProps = TagCloudVisDependencies &
  TagCloudVisRenderValue & {
    fireEvent: (event: any) => void;
    renderComplete: () => void;
  };

export const TagCloudChart = ({
  colors,
  visData,
  visParams,
  fireEvent,
  renderComplete,
}: TagCloudChartProps) => {
  const chartDiv = useRef<HTMLDivElement>(null);
  const visController = useRef<any>(null);

  useEffect(() => {
    if (chartDiv.current) {
      visController.current = new TagCloudVisualization(chartDiv.current, colors, fireEvent);
    }
    return () => {
      visController.current.destroy();
      visController.current = null;
    };
  }, [colors, fireEvent]);

  useEffect(() => {
    if (visController.current) {
      visController.current.render(visData, visParams).then(renderComplete);
    }
  }, [visData, visParams, renderComplete]);

  const updateChartSize = useMemo(
    () =>
      throttle(() => {
        if (visController.current) {
          visController.current.render(visData, visParams).then(renderComplete);
        }
      }, 300),
    [renderComplete, visData, visParams]
  );

  return (
    <EuiResizeObserver onResize={updateChartSize}>
      {(resizeRef) => (
        <div className="tgcChart__wrapper" ref={resizeRef}>
          <div className="tgcChart__container" ref={chartDiv} />
        </div>
      )}
    </EuiResizeObserver>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TagCloudChart as default };
