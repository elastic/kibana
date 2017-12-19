import PropTypes from 'prop-types';
import React from 'react';
import createLegendSeries from '../lib/create_legend_series';
import reactcss from 'reactcss';
import { htmlIdGenerator } from '@elastic/eui';

function VerticalLegend(props) {
  const rows = props.series.map(createLegendSeries(props));
  const htmlId = htmlIdGenerator();
  const hideLegend = !props.showLegend;
  const leftLegend = props.legendPosition === 'left';

  const styles = reactcss({
    default: {
      legend: { width: 200 }
    },
    leftLegend: {
      legend: { order: '-1' },
      control: { order: '2' }
    },
    hideLegend: {
      legend: { width: 12 },
      series: { display: 'none' },
    }
  }, { hideLegend, leftLegend });

  const openClass = leftLegend ? 'fa-chevron-right' : 'fa-chevron-left';
  const closeClass = leftLegend ? 'fa-chevron-left' : 'fa-chevron-right';
  const legendControlClass = hideLegend ? `fa ${openClass}` : `fa ${closeClass}`;

  return (
    <div className="rhythm_chart__legend" style={styles.legend}>
      <div className="rhythm_chart__legend-control" style={styles.control}>
        <button
          className={legendControlClass}
          onClick={props.onClick}
          aria-label="Toggle chart legend"
          aria-expanded={!!props.showLegend}
          aria-controls={htmlId('legend')}
        />
      </div>
      <div className="rhythm_chart__legend-series" style={styles.series} id={htmlId('legend')}>
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
