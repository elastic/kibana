import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import { get } from 'lodash';
import { Datasource } from '../datasource';

const template = ({ args, updateArgs }) => {
  const updateBucket = ({ target }) => {
    updateArgs && updateArgs({
      ...args,
      bucket: [{
        type: 'string',
        value: target.value,
      }],
    });
  };

  return (
    <div>
      <FormGroup controlId="formControlsSelect">
        <ControlLabel>Bucket Interval</ControlLabel>
        <FormControl
          componentClass="select"
          placeholder="select"
          value={get(args, 'bucket.0.value')}
          onChange={updateBucket}
        >
          <option value="second">Seconds</option>
          <option value="minute">Minutes</option>
          <option value="hour">Hours</option>
          <option value="day">Days</option>
        </FormControl>
      </FormGroup>
    </div>
  );
};

template.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
};

export const demoprices = () => new Datasource('demoprices', {
  displayName: 'Demo Prices',
  template,
});
