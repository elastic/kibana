import React from 'react';
import VerticalLegend from './vertical_legend';
import HorizontalLegend from './horizontal_legend';
export default React.createClass({
  render() {
    if (this.props.legendPosition === 'bottom') {
      return (<HorizontalLegend {...this.props}/>);
    }
    return (<VerticalLegend {...this.props}/>);
  }
});
