import React, { PropTypes } from 'react';
import _ from 'lodash';
import createLegendSeries from '../lib/create_legend_series';

function VerticalLegend(props) {
  const rows = props.series.map(createLegendSeries(props));
  const seriesStyle = {};
  const legendStyle = {};
  const controlStyle = {};
  let openClass = 'fa-chevron-left';
  let closeClass = 'fa-chevron-right';
  if (props.legendPosition === 'left') {
    openClass = 'fa-chevron-right';
    closeClass = 'fa-chevron-left';
    legendStyle.order = '-1';
    controlStyle.order = '2';
  }
  let legendControlClass = `fa ${closeClass}`;
  legendStyle.width = 200;
  if (!props.showLegend) {
    legendStyle.width = 12;
    seriesStyle.display = 'none';
    legendControlClass = `fa ${openClass}`;
  }
  return (
    <div className="rhythm_chart__legend" style={legendStyle}>
      <div className="rhythm_chart__legend-control" style={controlStyle}>
        <i className={legendControlClass} onClick={props.onClick}/>
      </div>
      <div className="rhythm_chart__legend-series" style={seriesStyle}>
        { rows }
      </div>
    </div>
  );

}

VerticalLegend.propTypes = {
  legendPosition: PropTypes.string,
  onClick: PropTypes.func,
  onToggle: PropTypes.func,
  series: PropTypes.array,
  showLegend: PropTypes.bool,
  seriesValues: PropTypes.object,
  seriesFilter: PropTypes.array,
  tickFormatter: PropTypes.func
};

export default VerticalLegend;
