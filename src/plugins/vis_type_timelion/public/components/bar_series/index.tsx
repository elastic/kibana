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

import React from 'react';
import { BarSeries, ScaleType } from '@elastic/charts';

export function BarSeriesComponent({ data, index }: { data: any; index: number }) {
  const bars = data.bars || {};
  const styles = {
    barSeriesStyle: {
      rect: {
        fill: data.color,
        opacity: !bars.fill || bars.fill < 0 ? 1 : bars.fill,
      },
    },
  };

  return (
    <BarSeries
      id={index + data.label}
      name={data.label}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      data={data.data}
      sortIndex={index}
      color={data.color}
      stackAccessors={data.stack ? [0] : undefined}
      {...styles}
    />
  );
}
