import React, { Component, PropTypes } from 'react';
export default (props) => {
  const bars = props.values.map(val => {
    const width = (val.value < 1) ? (val.value * 100) : 100;
    const style = {
      backgroundColor: val.color,
      width: `${width}%`
    };
    return (
      <div key={ val.color } className="bar" style={ style }></div>
    );
  });
  return (
    <div className="bar-vis">
      {bars}
    </div>
  );
};
