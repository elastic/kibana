import React from 'react';
import PropTypes from 'prop-types';
import { EuiLink } from '@elastic/eui';
import { Popover } from '../popover';
import { ColorPicker } from '../color_picker';
import { ColorDot } from '../color_dot';
import { WorkpadColorPicker } from '../workpad_color_picker/';

export const ColorPickerMini = ({ onChange, value, anchorPosition, colors }) => {
  const button = handleClick => (
    <EuiLink style={{ fontSize: 0 }} onClick={handleClick}>
      <ColorDot value={value} clickable />
    </EuiLink>
  );

  return (
    <Popover
      id="color-picker-mini-popover"
      panelClassName="canvas canvasColorPickerMini__popover"
      button={button}
      anchorPosition={anchorPosition}
    >
      {() =>
        colors ? (
          <ColorPicker onChange={onChange} value={value} colors={colors} />
        ) : (
          <WorkpadColorPicker onChange={onChange} value={value} />
        )
      }
    </Popover>
  );
};

ColorPickerMini.propTypes = {
  colors: PropTypes.array,
  value: PropTypes.string,
  onChange: PropTypes.func,
  anchorPosition: PropTypes.string,
};
