import React from 'react';
import PropTypes from 'prop-types';
import { Popover, OverlayTrigger } from 'react-bootstrap';
import { ColorPicker } from '../color_picker';
import { ColorDot } from '../color_dot';
import './color_picker_mini.less';
import { WorkpadColorPicker } from '../workpad_color_picker/';

export const ColorPickerMini = ({ onChange, value, placement, colors }) => {
  const picker = (
    <Popover id="popover-trigger-click" style={{ width: 207 }}>
      {colors ? (
        <ColorPicker onChange={onChange} value={value} colors={colors} />
      ) : (
        <WorkpadColorPicker onChange={onChange} value={value} />
      )}
    </Popover>
  );

  return (
    <div className="canvas__color-picker-mini">
      <OverlayTrigger rootClose overlay={picker} placement={placement || 'bottom'} trigger="click">
        <div>
          <ColorDot value={value} />
        </div>
      </OverlayTrigger>
    </div>
  );
};

ColorPickerMini.propTypes = {
  colors: PropTypes.array,
  value: PropTypes.string,
  onChange: PropTypes.func,
  placement: PropTypes.string,
};
