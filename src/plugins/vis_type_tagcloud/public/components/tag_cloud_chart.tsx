/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
