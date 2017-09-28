import React from 'react';
import PropTypes from 'prop-types';
import './text_style_picker.less';
import { Button, ButtonGroup, FormControl, FormGroup } from 'react-bootstrap';
import { FontPicker } from '../font_picker';
import { fontSizes } from './font_sizes';
import { ColorPickerMini } from '../color_picker_mini';

export const TextStylePicker = ({ family, size, align, color, weight, underline, italic, onChange }) => {

  function doChange(propName, value) {
    onChange(Object.assign({
      family,
      size,
      align,
      color,
      weight,
      underline,
      italic,
    }, {
      [propName]: value,
    }));
  }

  return (
    <div className="canvas__text-style-picker">
      <FormGroup className="canvas__text-style-picker--top">
        <div style={{ display: 'inline-block', width: 60 }}>
          <FormControl
            componentClass="select"
            value={size}
            onChange={(e) => doChange('size', Number(e.target.value))}
          >
            {fontSizes.map(size => (
              <option key={ size } value={size}>{ size }</option>
            ))}
          </FormControl>
        </div>
        <FontPicker
          value={family}
          onSelect={(value) => doChange('family', value)}
        />
      </FormGroup>
      <FormGroup className="canvas__text-style-picker--bottom">
        <ColorPickerMini value={color} onChange={(value) => doChange('color', value)}/>
        <ButtonGroup bsSize="small">
          <Button active={weight === 'bold'}
            onClick={() => doChange('weight', weight !== 'bold' ? 'bold' : 'normal')}><span style={{ fontWeight: 'bold' }}>B</span></Button>
          <Button active={italic}
            onClick={() => doChange('italic', !italic)}><span style={{ fontStyle: 'italic' }}>I</span></Button>
          <Button active={underline}
            onClick={() => doChange('underline', !underline)}><span style={{ textDecoration: 'underline' }}>U</span></Button>
        </ButtonGroup>
        &nbsp;
        <ButtonGroup bsSize="small">
          <Button active={align === 'left'}
            onClick={() => doChange('align', 'left')}><i className="fa fa-align-left"/></Button>
          <Button active={align === 'center'}
            onClick={() => doChange('align', 'center')}><i className="fa fa-align-center"/></Button>
          <Button active={align === 'right'}
            onClick={() => doChange('align', 'right')}><i className="fa fa-align-right"/></Button>
        </ButtonGroup>
      </FormGroup>
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
  onChange: PropTypes.func,
};
