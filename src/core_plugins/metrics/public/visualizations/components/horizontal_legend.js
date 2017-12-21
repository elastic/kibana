import PropTypes from 'prop-types';
import React from 'react';
import createLegendSeries from '../lib/create_legend_series';
import reactcss from 'reactcss';
import { htmlIdGenerator } from '@elastic/eui';

function HorizontalLegend(props) {
  const rows = props.series.map(createLegendSeries(props));
  const htmlId = htmlIdGenerator();
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
        <button
          className={legendControlClass}
          onClick={props.onClick}
          aria-label="Toggle chart legend"
          aria-expanded={!!props.showLegend}
          aria-controls={htmlId('legend')}
        />
      </div>
      <div className="rhythm_chart__legend-series" style={styles.legend} id={htmlId('legend')}>
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
