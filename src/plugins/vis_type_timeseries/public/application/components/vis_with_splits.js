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
import { getDisplayName } from './lib/get_display_name';
import { last, findIndex, first } from 'lodash';
import { calculateLabel } from '../../../../../plugins/vis_type_timeseries/common/calculate_label';

export function visWithSplits(WrappedComponent) {
  function SplitVisComponent(props) {
    const { model, visData } = props;
    if (!model || !visData || !visData[model.id]) return <WrappedComponent {...props} />;
    if (visData[model.id].series.every((s) => s.id.split(':').length === 1)) {
      return <WrappedComponent {...props} />;
    }

    const splitsVisData = visData[model.id].series.reduce((acc, series) => {
      const [seriesId, splitId] = series.id.split(':');
      const seriesModel = model.series.find((s) => s.id === seriesId);
      if (!seriesModel || !splitId) return acc;
      const metric = last(seriesModel.metrics);
      const label = calculateLabel(metric, seriesModel.metrics);

      if (!acc[splitId]) {
        acc[splitId] = {
          series: [],
          label: series.label.toString(),
        };
      }

      acc[splitId].series.push({
        ...series,
        id: seriesId,
        color: series.color || seriesModel.color,
        label: seriesModel.label || label,
      });
      return acc;
    }, {});

    const nonSplitSeries = first(
      visData[model.id].series.filter((series) => {
        const seriesModel = model.series.find((s) => s.id === series.id);
        if (!seriesModel) return false;
        return ['everything', 'filter'].includes(seriesModel.split_mode);
      })
    );

    const indexOfNonSplit = nonSplitSeries
      ? findIndex(model.series, (s) => s.id === nonSplitSeries.id)
      : null;

    const rows = Object.keys(splitsVisData).map((key) => {
      const splitData = splitsVisData[key];
      const { series, label } = splitData;
      const newSeries =
        indexOfNonSplit != null && indexOfNonSplit > 0
          ? [...series, nonSplitSeries]
          : [nonSplitSeries, ...series];
      const newVisData = {
        [model.id]: {
          id: model.id,
          series: newSeries || series,
        },
      };
      return (
        <div key={key} className="tvbSplitVis__split">
          <WrappedComponent
            model={model}
            visData={newVisData}
            onBrush={props.onBrush}
            additionalLabel={label}
            backgroundColor={props.backgroundColor}
            getConfig={props.getConfig}
          />
        </div>
      );
    });

    return <div className="tvbSplitVis">{rows}</div>;
  }
  SplitVisComponent.displayName = `SplitVisComponent(${getDisplayName(WrappedComponent)})`;
  return SplitVisComponent;
}
