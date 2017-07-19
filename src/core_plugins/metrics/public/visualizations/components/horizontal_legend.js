import React, { PropTypes } from 'react';
import createLegendSeries from '../lib/create_legend_series';
import reactcss from 'reactcss';

function HorizontalLegend(props) {
  const rows = props.series.map(createLegendSeries(props));
  const styles = reactcss({
    hideLegned: {
      legend: {
        display: 'none'
      }
    }
  }, { hideLegned: !props.showLegend });
  let legendControlClass = 'fa fa-chevron-down';
  if (!props.showLegend) {
    legendControlClass = 'fa fa-chevron-up';
  }
  return (
    <div className="rhythm_chart__legend-horizontal">
      <div className="rhythm_chart__legend-control">
        <i className={legendControlClass} onClick={props.onClick}/>
      </div>
      <div className="rhythm_chart__legend-series" style={styles.legend}>
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
