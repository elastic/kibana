import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';
import { readableColor } from '../../lib/readable_color';

import './color_manager.less';

export const ColorManager = ({ value, addColor, removeColor, onChange }) => {

  return (
    <div className="canvas__color-manager">

      <FormControl
        type="text"
        value={value}
        placeholder="#hex color"
        style={{ backgroundColor: value, color: readableColor(value) }}
        className="canvas__color-manager--input"
        onChange={e => onChange(e.target.value)}
      />
      <i onClick={() => addColor(value)} className="canvas__color-manager--add fa fa-plus-circle"/>
      <i onClick={() => removeColor(value)} className="canvas__color-manager--remove fa fa-times-circle"/>


    </div>
  );
};

ColorManager.propTypes = {
  value: PropTypes.string,
  updateValue: PropTypes.func,
  addColor: PropTypes.func,
  removeColor: PropTypes.func,
  onChange: PropTypes.func,

};
