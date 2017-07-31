import React from 'react';
import PropTypes from 'prop-types';
import { readableColor } from '../../lib/readable_color';
import { last } from 'lodash';

import './color_picker.less';

export const ColorPicker = ({ value, colors, colorsPerRow, onChange }) => {

  colors = colors || [];
  colorsPerRow = colorsPerRow || 6;

  const table = colors.reduce((rows, color) => {
    if (last(rows).length >= colorsPerRow) rows.push([]);



    const background = color === 'rgba(1,1,1,0)' ?
    {
      backgroundImage: `
        linear-gradient(45deg, #aaa 25%, transparent 25%),
        linear-gradient(-45deg, #aaa 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #aaa 75%),
        linear-gradient(-45deg, transparent 75%, #aaa 75%)`,
      backgroundSize: '8px 8px',
    } :
    { background: color };

    const dot = (
      <div key={color}
      onClick={() => onChange(color)}
      className="canvas__color-picker--dot"
      style={background}>
      { color !== value ? <i className="fa"/> :
        <i className="fa fa-check" style={{ color: readableColor(value) }}/>
      }
      </div>
    );

    last(rows).push(dot);
    return rows;
  }, [[]]);

  return (
    <div className="canvas__color-picker">
      {table.map((row, i) => (<div key={i}> {row} </div>))}
    </div>
  );
};

ColorPicker.propTypes = {
  value: PropTypes.string,
  colors: PropTypes.array,
  colorsPerRow: PropTypes.number,
  onChange: PropTypes.func,
  addColor: PropTypes.func,
  removeColor: PropTypes.func,
};
