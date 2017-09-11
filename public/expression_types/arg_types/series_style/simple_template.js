import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { set, del } from 'object-path-immutable';
import { ColorPickerMini } from '../../../components/color_picker_mini';

export const simpleTemplate = (props) => {
  const { argValue, onValueChange } = props;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});
  const color = get(chainArgs, 'color.0', '');

  const handleChange = (argName, ev) => {
    const fn = ev.target.value === '' ? del : set;

    const newValue = fn(argValue, ['chain', 0, 'arguments', argName], [ev.target.value]);
    return onValueChange(newValue);
  };

  const handlePlain = (argName, val) => handleChange(argName, { target: { value: val } });

  return (
    <div className="canvas__argtype--seriesStyle--color">
      { !color || color.length === 0 ?
        <div className="canvas__argtype--seriesStyle--color-picker">
          <div>
            <a onClick={() => handlePlain('color', '#000000')}>Auto <i className="fa fa-bolt"/> </a>
          </div>
        </div>
      :
        <div className="canvas__argtype--seriesStyle--color-picker">
          <div className="canvas__argtype--seriesStyle--remove-color">
            <i onClick={() => handlePlain('color', '')} className="fa fa-times-circle clickable"/>
          </div>
          <ColorPickerMini
            value={color}
            onChange={(val) => handlePlain('color', val)} />
        </div>
      }
    </div>
  );
};

simpleTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  renderError: PropTypes.func,
};
