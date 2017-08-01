import React from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, FormControl, ControlLabel } from 'react-bootstrap';
import { get } from 'lodash';
import { set, del } from 'object-path-immutable';
import { ColorPickerMini } from '../../../components/color_picker_mini';
import { LabeledSelect } from './labeled_select';
import { ArgType } from '../../arg_type';
import './series_style.less';

const template = (props) => {
  const { typeInstance, onValueChange, labels, argValue } = props;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});
  const { name, displayName } = typeInstance;

  const handleChange = (argName, ev) => {
    const fn = ev.target.value === '' ? del : set;

    const newValue = fn(argValue, ['chain', 0, 'arguments', argName], [{
      type: 'string',
      value: ev.target.value,
    }]);
    return onValueChange(newValue);
  };

  const handlePlain = (argName, val) => handleChange(argName, { target: { value: val } });

  // TODO: add fill and stack options
  // TODO: add label name auto-complete
  const label = get(chainArgs, 'label.0.value', '');
  const color = get(chainArgs, 'color.0.value', '');

  return (
    <Form onSubmit={() => false}>
      <FormGroup controlId="formControlsSelect">
        <ControlLabel>{displayName}</ControlLabel>
        <div className="canvas__argtype--seriesStyle">
          {name !== 'defaultStyle' &&
            (
              <FormControl
                componentClass="select"
                placeholder="Select Series"
                value={label}
                onChange={(ev) => handleChange('label', ev)}
              >
                <option value={null} disabled>Select a Series Label</option>
                { labels.sort().map(val => <option key={val} value={val}>{val}</option>) }
              </FormControl>
            )
          }
          <div className="canvas__argtype--seriesStyle--properties">
            <LabeledSelect label="Line" argName="lines" value={get(chainArgs, 'lines.0.value', 0)} onChange={handleChange} />
            <LabeledSelect label="Bar" argName="bars" value={get(chainArgs, 'bars.0.value', 0)} onChange={handleChange} />
            <LabeledSelect label="Point" argName="points" value={get(chainArgs, 'points.0.value', 0)} onChange={handleChange} />
            <div className="canvas__argtype--seriesStyle--color">
              <label>Color</label>
              { !color || color.length === 0 ?
                <div className="canvas__argtype--seriesStyle--color-picker">
                  <div>
                    <a onClick={() => handlePlain('color', '#000000')}>Auto <i className="fa fa-bolt"/> </a>
                  </div>
                </div>
              :
                (
                  <div className="canvas__argtype--seriesStyle--color-picker">
                    <ColorPickerMini
                      value={color}
                      onChange={(val) => handlePlain('color', val)} />
                    <div className="canvas__argtype--seriesStyle--remove-color">
                      <i onClick={() => handlePlain('color', '')} className="fa fa-times-circle clickable"/>
                    </div>
                  </div>
                )
              }

            </div>
          </div>

      </div>
      </FormGroup>
    </Form>
  );
};

template.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.object.isRequired,
  typeInstance: PropTypes.object,
  labels: PropTypes.array,
};

export const seriesStyle = () => new ArgType('seriesStyle', {
  displayName: 'Series Style',
  description: 'Set the style for a particular series, mapped to column names',
  template: template,
});
