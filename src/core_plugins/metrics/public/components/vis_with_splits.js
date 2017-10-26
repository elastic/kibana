import React from 'react';
import { getDisplayName } from './lib/get_display_name';
import { last, findIndex, first } from 'lodash';
import calculateLabel  from '../../common/calculate_label';
export function visWithSplits(WrappedComponent) {
  function SplitVisComponent(props) {
    const { model, visData } = props;
    if (!model || !visData || !visData[model.id]) return (<WrappedComponent {...props} />);
    if (visData[model.id].series.every(s => s.id.split(':').length === 1)) {
      return (<WrappedComponent {...props} />);
    }

    const splitsVisData = visData[model.id].series.reduce((acc, series) => {
      const [seriesId, splitId] = series.id.split(':');
      const seriesModel = model.series.find(s => s.id === seriesId);
      if (!seriesModel || !splitId) return acc;
      const metric = last(seriesModel.metrics);
      const label = calculateLabel(metric, seriesModel.metrics);
      if (!acc[splitId]) acc[splitId] = { series: [], label: series.label };
      acc[splitId].series.push({
        ...series,
        id: seriesId,
        color: seriesModel.color,
        label: seriesModel.label || label
      });
      return acc;
    }, {});

    const nonSplitSeries = first(visData[model.id].series.filter((series) => {
      const seriesModel = model.series.find(s => s.id === series.id);
      if (!seriesModel) return false;
      return ['everything', 'filter'].includes(seriesModel.split_mode);
    }));

    const indexOfNonSplit = nonSplitSeries ? findIndex(model.series, s => s.id === nonSplitSeries.id) : null;


    const rows = Object.keys(splitsVisData).map(key => {
      const splitData = splitsVisData[key];
      const { series, label } = splitData;
      const newSeries = (indexOfNonSplit != null && indexOfNonSplit > 0) ?  [...series, nonSplitSeries] : [nonSplitSeries, ...series];
      const newVisData = {
        [model.id]: {
          id: model.id,
          series: newSeries || series
        }
      };
      return (
        <div key={key} className="splitVis_split">
          <div className="splitVis_visualization">
            <WrappedComponent
              model={model}
              visData={newVisData}
              onBrush={props.onBrush}
              additionalLabel={label}
              backgroundColor={props.backgroundColor}
            />
          </div>
        </div>
      );
    });

    return (
      <div className="splitVis">{rows}</div>
    );
  }
  SplitVisComponent.displayName = `SplitVisComponent(${getDisplayName(WrappedComponent)})`;
  return SplitVisComponent;
}
