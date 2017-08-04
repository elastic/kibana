import React from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, FormControl, ControlLabel } from 'react-bootstrap';
import { get } from 'lodash';
import { set, del } from 'object-path-immutable';
import { ColorPickerMini } from '../../../components/color_picker_mini';
import { LabeledSelect } from './labeled_select';
import { ArgType } from '../../arg_type';
import './series_style.less';

const simpleTemplate = (props) => {
  const { argValue, onValueChange } = props;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});
  const color = get(chainArgs, 'color.0.value', '');

  const handleChange = (argName, ev) => {
    const fn = ev.target.value === '' ? del : set;

    const newValue = fn(argValue, ['chain', 0, 'arguments', argName], [{
      type: 'string',
      value: ev.target.value,
    }]);
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

const template = (props) => {
  const { typeInstance, onValueChange, labels, argValue, setLabel } = props;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});
  const { name } = typeInstance;

  const handleChange = (argName, ev) => {
    const fn = ev.target.value === '' ? del : set;

    const newValue = fn(argValue, ['chain', 0, 'arguments', argName], [{
      type: 'string',
      value: ev.target.value,
    }]);
    return onValueChange(newValue);
  };

  // TODO: add fill and stack options
  // TODO: add label name auto-complete
  const label = get(chainArgs, 'label.0.value', '');

  // TODO: OMG Gross. Its this or lifecycles. So gross.
  setTimeout(() => {if (label) setLabel(`Style: ${label}`);}, 0);

  return (
    <Form onSubmit={() => false}>
      <div className="canvas__argtype--seriesStyle">
        {name !== 'defaultStyle' &&
          (
            <FormGroup>
              <FormControl
                componentClass="select"
                placeholder="Select Series"
                value={label}
                onChange={ev => handleChange('label', ev)}
              >
                <option value={null} disabled>Select a Series Label</option>
                { labels.sort().map(val => <option key={val} value={val}>{val}</option>) }
              </FormControl>
              <ControlLabel>Series Identifier</ControlLabel>
            </FormGroup>
          )
        }
        <FormGroup>
          <div className="canvas__argtype--seriesStyle--properties">
            <LabeledSelect label="Line" argName="lines" value={get(chainArgs, 'lines.0.value', 0)} onChange={handleChange} />
            <LabeledSelect label="Bar" argName="bars" value={get(chainArgs, 'bars.0.value', 0)} onChange={handleChange} />
            <LabeledSelect label="Point" argName="points" value={get(chainArgs, 'points.0.value', 0)} onChange={handleChange} />
          </div>
        </FormGroup>
      </div>
    </Form>
  );
};

template.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.object.isRequired,
  typeInstance: PropTypes.object,
  labels: PropTypes.array,
  setLabel: PropTypes.func,
};

simpleTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.object.isRequired,
};

export const seriesStyle = () => new ArgType('seriesStyle', {
  displayName: 'Series Style',
  description: 'Set the style for a particular series, mapped to column names',
  template,
  simpleTemplate,
});
