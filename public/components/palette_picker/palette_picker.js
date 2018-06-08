import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import { EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Popover } from '../popover';
import { PaletteSwatch } from '../palette_swatch';
import { palettes } from '../../../common/lib/palettes';
import './palette_picker.less';

export const PalettePicker = ({ onChange, value, anchorPosition }) => {
  const button = handleClick => (
    <EuiLink style={{ width: '100%' }} onClick={handleClick}>
      <PaletteSwatch colors={value.colors} gradient={value.gradient} />
    </EuiLink>
  );

  return (
    <Popover
      id="palette-picker-popover"
      button={button}
      anchorPosition={anchorPosition}
      panelClassName="canvas__palette-picker--swatches-popover"
    >
      {() => (
        <div className="canvas canvas__palette-picker--swatches">
          {map(palettes, (palette, name) => (
            <EuiLink
              key={name}
              onClick={() => onChange(palette)}
              className="canvas__palette-picker--swatch"
              style={{ width: '100%' }}
            >
              <EuiFlexGroup gutterSize="none" alignItems="center">
                <EuiFlexItem grow={1}>
                  <span className="canvas__palette-picker--label">{name.replace(/_/g, ' ')}</span>
                </EuiFlexItem>
                <EuiFlexItem grow={2}>
                  <PaletteSwatch colors={palette.colors} gradient={palette.gradient} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiLink>
          ))}
        </div>
      )}
    </Popover>
  );
};

PalettePicker.propTypes = {
  value: PropTypes.object,
  onChange: PropTypes.func,
  anchorPosition: PropTypes.string,
};
