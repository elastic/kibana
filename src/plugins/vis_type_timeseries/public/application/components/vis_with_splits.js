/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { getDisplayName } from './lib/get_display_name';
import { labelDateFormatter } from './lib/label_date_formatter';
import { findIndex, first } from 'lodash';

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

      const label = series.splitByLabel;

      if (!acc[splitId]) {
        acc[splitId] = {
          series: [],
          label: series.label.toString(),
          labelFormatted: series.labelFormatted,
        };
      }

      const labelHasKeyPlaceholder = /{{\s*key\s*}}/.test(seriesModel.label);

      acc[splitId].series.push({
        ...series,
        id: seriesId,
        color: series.color || seriesModel.color,
        label: seriesModel.label && !labelHasKeyPlaceholder ? seriesModel.label : label,
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
      const { series, label, labelFormatted } = splitData;
      let additionalLabel = label;
      if (labelFormatted) {
        additionalLabel = labelDateFormatter(labelFormatted);
      }
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
            additionalLabel={additionalLabel}
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
