import React from 'react';
import PropTypes from 'prop-types';
import { readableColor } from '../../lib/readable_color';
import { ColorDot } from '../color_dot';
import { ItemGrid } from '../item_grid';

import './color_palette.less';

export const ColorPalette = ({ value, colors, colorsPerRow, onChange }) => (
  <div className="canvas__color-palette">
    <ItemGrid items={colors} itemsPerRow={colorsPerRow || 6}>
      {({ item: color }) => (
        <div key={color} onClick={() => onChange(color)} className="canvas__color-palette--dot">
          <ColorDot value={color}>
            {color === value && (
              <i className="fa fa-check" style={{ color: readableColor(value) }} />
            )}
            {color !== value && <i className="fa" />}
          </ColorDot>
        </div>
      )}
    </ItemGrid>
  </div>
);

ColorPalette.propTypes = {
  colors: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  colorsPerRow: PropTypes.number,
};
