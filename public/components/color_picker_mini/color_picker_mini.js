import React from 'react';
import PropTypes from 'prop-types';
import { ColorPicker } from '../color_picker';
import { ColorDot } from '../color_dot';
import { Popover, Overlay } from 'react-bootstrap';
import './color_picker_mini.less';


export const ColorPickerMini = ({ onChange, value, placement, popover, setPopover, target, setTarget }) => {
  function open(e) {
    setTarget(e.target);
    setPopover(!popover);
  }

  function setColor(color) {
    onChange(color);
    setPopover(false);
  }

  return (
    <div className="canvas__color-picker-mini">
      <span onClick={open}><ColorDot value={value}/></span>

      <Overlay
          show={popover}
          placement={placement || 'bottom'}
          container={this}
          target={target}
        >
          <Popover id="popover-trigger-click" style={{ width: 207 }}>
            <ColorPicker onChange={color => setColor(color)} value={value}/>
          </Popover>
        </Overlay>
    </div>
  );
};

ColorPickerMini.propTypes = {
  value: PropTypes.string,
  popover: PropTypes.bool,
  setPopover: PropTypes.func,
  target: PropTypes.object,
  setTarget: PropTypes.func,
  onChange: PropTypes.func,
  placement: PropTypes.string,
};
