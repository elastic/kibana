import React from 'react';
import PropTypes from 'prop-types';
import { EuiLink } from '@elastic/eui';
import { Popover } from '../popover';
import { ShapePicker } from '../shape_picker/';
import { ShapePreview } from '../shape_preview';

export const ShapePickerMini = ({ onChange, value, anchorPosition }) => {
  const button = handleClick => (
    <EuiLink style={{ fontSize: 0 }} onClick={handleClick}>
      <ShapePreview value={value} />
    </EuiLink>
  );

  return (
    <Popover
      panelClassName="canvas canvasShapePickerMini--popover"
      button={button}
      anchorPosition={anchorPosition}
    >
      {() => <ShapePicker onChange={onChange} value={value} />}
    </Popover>
  );
};

ShapePickerMini.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  anchorPosition: PropTypes.string,
};
