import React, { PropTypes } from 'react';
import VerticalLegend from './vertical_legend';
import HorizontalLegend from './horizontal_legend';

function Legend(props) {
  if (props.legendPosition === 'bottom') {
    return (<HorizontalLegend {...props}/>);
  }
  return (<VerticalLegend {...props}/>);
}

Legend.propTypes = {
  legendPosition: PropTypes.string,
  onClick: PropTypes.func,
  onToggle: PropTypes.func,
  series: PropTypes.array,
  showLegend: PropTypes.bool,
  seriesValues: PropTypes.object,
  seriesFilter: PropTypes.array,
  tickFormatter: PropTypes.func
};

export default Legend;
