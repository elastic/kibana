import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import { get } from 'lodash';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import header from './header.png';

const DemopricesDatasource = ({ args, updateArgs }) => {
  const updateBucket = ({ target }) => {
    updateArgs &&
      updateArgs({
        ...args,
        bucket: [target],
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

DemopricesDatasource.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
};

export const demoprices = () => ({
  name: 'demoprices',
  displayName: 'Demo Prices',
  help: 'Product pricing data in a variety of intervals',
  image: header,
  template: templateFromReactComponent(DemopricesDatasource),
});
