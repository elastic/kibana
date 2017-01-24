import React from 'react';
import { CirclePicker } from 'react-color';
import _ from 'lodash';

export default React.createClass({
  setColor(color) {
    const {page, onChange} = this.props;
    onChange({...page, style: {...page.style, backgroundColor: color.hex}});
  },
  render() {
    const {page, onChange} = this.props;

    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
      '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
      '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b',
      '#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333', '#000000',
    ];

    return (
      <div className='rework--page-properties'>
        <h4>Page Background</h4>
        <CirclePicker color={page.style.backgroundColor} colors={colors} circleSize={24} circleSpacing={6} onChange={this.setColor}/>
      </div>
    );
  }
});
