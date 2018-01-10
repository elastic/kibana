import React from 'react';
import PropTypes from 'prop-types';
import { Popover, OverlayTrigger } from 'react-bootstrap';
import { map } from 'lodash';
import { PaletteSwatch } from '../palette_swatch';
import { palettes } from '../../../common/lib/palettes';
import './palette_picker.less';

export const PalettePicker = ({ onChange, value, placement }) => {
  const picker = (
    <Popover id="popover-trigger-click">
      <div className="canvas__palette-picker--swatches">
        {map(palettes, (palette, name) => (
          <div
            key={name}
            onClick={() => onChange(palette)}
            className="clickable canvas__palette-picker--swatch"
          >
            <div className="clickable canvas__palette-picker--label">{name.replace(/_/g, ' ')}</div>
            <PaletteSwatch colors={palette.colors} gradient={palette.gradient} />
          </div>
        ))}
      </div>
    </Popover>
  );

  return (
    <div className="canvas__palette-picker">
      <OverlayTrigger rootClose overlay={picker} placement={placement || 'bottom'} trigger="click">
        <div style={{ width: '100%' }}>
          <PaletteSwatch colors={value.colors} gradient={value.gradient} />
        </div>
      </OverlayTrigger>
    </div>
  );
};

PalettePicker.propTypes = {
  value: PropTypes.object,
  onChange: PropTypes.func,
  placement: PropTypes.string,
};
