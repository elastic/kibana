import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup } from 'react-bootstrap';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiSpacer } from '@elastic/eui';
import { FontPicker } from '../font_picker';
import { ColorPickerMini } from '../color_picker_mini';
import { fontSizes } from './font_sizes';

export const TextStylePicker = ({
  family,
  size,
  align,
  color,
  weight,
  underline,
  italic,
  onChange,
  colors,
}) => {
  function doChange(propName, value) {
    onChange({
      family,
      size,
      align,
      color,
      weight: weight || 'normal',
      underline: underline || false,
      italic: italic || false,
      [propName]: value,
    });
  }

  return (
    <div className="canvas__text-style-picker">
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiSelect
            defaultValue={size}
            onChange={e => doChange('size', Number(e.target.value))}
            options={fontSizes.map(size => ({ text: String(size), value: size }))}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <FontPicker value={family} onSelect={value => doChange('family', value)} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="none" justifyContent="spaceAround" alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <ColorPickerMini
            value={color}
            onChange={value => doChange('color', value)}
            colors={colors}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {/* The bootstrap button groups will be removed when EUI has button groups. See https://github.com/elastic/eui/issues/841 */}
          <ButtonGroup bsSize="medium">
            <Button
              active={weight === 'bold'}
              onClick={() => doChange('weight', weight !== 'bold' ? 'bold' : 'normal')}
            >
              <span style={{ fontWeight: 'bold' }}>B</span>
            </Button>
            <Button active={italic} onClick={() => doChange('italic', !italic)}>
              <span style={{ fontStyle: 'italic' }}>I</span>
            </Button>
            <Button active={underline} onClick={() => doChange('underline', !underline)}>
              <span style={{ textDecoration: 'underline' }}>U</span>
            </Button>
          </ButtonGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ButtonGroup bsSize="medium">
            <Button active={align === 'left'} onClick={() => doChange('align', 'left')}>
              <i className="fa fa-align-left" />
            </Button>
            <Button active={align === 'center'} onClick={() => doChange('align', 'center')}>
              <i className="fa fa-align-center" />
            </Button>
            <Button active={align === 'right'} onClick={() => doChange('align', 'right')}>
              <i className="fa fa-align-right" />
            </Button>
          </ButtonGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

TextStylePicker.propTypes = {
  family: PropTypes.string,
  size: PropTypes.number,
  align: PropTypes.string,
  color: PropTypes.string,
  weight: PropTypes.string,
  underline: PropTypes.bool,
  italic: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  colors: PropTypes.array,
};
