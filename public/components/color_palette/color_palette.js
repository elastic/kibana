import React from 'react';
import PropTypes from 'prop-types';
import { readableColor } from '../../lib/readable_color';
import { ColorDot } from '../color_dot';
import { last } from 'lodash';

import './color_palette.less';

export const ColorPalette = ({ value, colors, colorsPerRow, onChange }) => {

  colors = colors || [];
  colorsPerRow = colorsPerRow || 6;

  const table = colors.reduce((rows, color) => {
    if (last(rows).length >= colorsPerRow) rows.push([]);

    const dot = (
      <div key={color}
      onClick={() => onChange(color)}
      className="canvas__color-palette--dot">
        <ColorDot value={color}>
          { color !== value ? <i className="fa"/> :
            <i className="fa fa-check" style={{ color: readableColor(value) }}/>
          }
        </ColorDot>
      </div>
    );

    last(rows).push(dot);
    return rows;
  }, [[]]);

  return (
    <div className="canvas__color-palette">
      {table.map((row, i) => (<div key={i}> {row} </div>))}
    </div>
  );
};

ColorPalette.propTypes = {
  value: PropTypes.string,
  colors: PropTypes.array,
  colorsPerRow: PropTypes.number,
  onChange: PropTypes.func,
  addColor: PropTypes.func,
  removeColor: PropTypes.func,
};
