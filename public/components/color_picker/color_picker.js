import React from 'react';
import PropTypes from 'prop-types';
import chroma from 'chroma-js';
import { last } from 'lodash';

import './color_picker.less';

export const ColorPicker = ({ value, colors, colorsPerRow, onChange }) => {

  colors = colors || [];
  colorsPerRow = colorsPerRow || 6;

  let selectColor;
  try {
    selectColor = chroma.contrast(value, '#000') < 4.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  } catch (e) {
    selectColor = 'rgba(0,0,0,0.5)';
  }

  const table = colors.reduce((rows, color) => {
    if (last(rows).length >= colorsPerRow) rows.push([]);

    const classNames = ['fa fa-stack-2x'];
    classNames.push(color === 'rgba(0,0,0,0)' ? 'fa fa-ban' : 'fa fa-circle');

    const fontColor = color === 'rgba(0,0,0,0)' ? '#000000' : color;
    const dot = (
      <span key={color} className="fa-stack" onClick={() => onChange(color)}>
        <i className={ classNames.join(' ')} style={{ color: fontColor }}/>
        { value !== color ? null :
          (<i className="fa fa-circle-o fa-stack-2x" style={{ color: selectColor }}/>)
        }
      </span>
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
};
