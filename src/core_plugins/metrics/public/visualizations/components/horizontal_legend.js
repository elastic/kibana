import React, { PropTypes } from 'react';
import _ from 'lodash';
import createLegendSeries from '../lib/create_legend_series';

function HorizontalLegend(props) {
  const rows = props.series.map(createLegendSeries(props));
  const legendStyle = { };
  let legendControlClass = 'fa fa-chevron-down';
  if (!props.showLegend) {
    legendStyle.display = 'none';
    legendControlClass = 'fa fa-chevron-up';
  }
  return (
    <div className="rhythm_chart__legend-horizontal">
      <div className="rhythm_chart__legend-control">
        <i className={legendControlClass} onClick={props.onClick}/>
      </div>
      <div className="rhythm_chart__legend-series" style={legendStyle}>
        { rows }
      </div>
    </div>
  );
}

HorizontalLegend.propTypes = {
  legendPosition: PropTypes.string,
  onClick: PropTypes.func,
  onToggle: PropTypes.func,
  series: PropTypes.array,
  showLegend: PropTypes.bool,
  seriesValues: PropTypes.object,
  seriesFilter: PropTypes.array,
  tickFormatter: PropTypes.func
};

export default HorizontalLegend;
