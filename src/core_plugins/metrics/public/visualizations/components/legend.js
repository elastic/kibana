import PropTypes from 'prop-types';
import React from 'react';
import VerticalLegend from './vertical_legend';
import HorizontalLegend from './horizontal_legend';
import TableLegend from './table_legend';

function Legend(props) {
  if (props.legendPosition === 'bottom') {
    return (<HorizontalLegend {...props}/>);
  }
  if (props.legendPosition === 'table') {
    return (<TableLegend {...props}/>);
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
