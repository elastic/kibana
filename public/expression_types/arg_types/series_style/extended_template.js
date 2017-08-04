import React from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, FormControl, ControlLabel } from 'react-bootstrap';
import { get } from 'lodash';
import { set, del } from 'object-path-immutable';
import { LabeledSelect } from './labeled_select';

export const extendedTemplate = (props) => {
  const { typeInstance, onValueChange, labels, argValue } = props;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});
  const selectedSeries = get(chainArgs, 'label.0.value', '');
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

  return (
    <Form onSubmit={() => false}>
      <div className="canvas__argtype--seriesStyle">
        {name !== 'defaultStyle' &&
          (
            <FormGroup>
              <FormControl
                componentClass="select"
                placeholder="Select Series"
                value={selectedSeries}
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

extendedTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.object.isRequired,
  typeInstance: PropTypes.object,
  labels: PropTypes.array.isRequired,
  setLabel: PropTypes.func.isRequired,
};
