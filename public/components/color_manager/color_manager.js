import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';
import { readableColor } from '../../lib/readable_color';

import './color_manager.less';

export const ColorManager = ({ value, addColor, removeColor, onChange }) => (
  <div className="canvas__color-manager">
    <div
      style={{ display: 'inline-block' }}
      className="canvas__checkered canvas__color-manager--input"
    >
      <FormControl
        type="text"
        value={value || ''}
        placeholder="#hex color"
        style={{ backgroundColor: value, color: readableColor(value) }}
        onChange={e => onChange(e.target.value)}
      />
    </div>
    <i
      onClick={() => addColor(value)}
      className="canvas__color-manager--add fa fa-plus-circle"
    />
    <i
      onClick={() => removeColor(value)}
      className="canvas__color-manager--remove fa fa-times-circle"
    />
  </div>
);

ColorManager.propTypes = {
  value: PropTypes.string,
  addColor: PropTypes.func.isRequired,
  removeColor: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};
