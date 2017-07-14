import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl, ControlLabel } from 'react-bootstrap';

export const DatasourceSelector = ({ onSelect, selected, datasources }) => (
  <FormGroup controlId="formControlsSelect">
    <ControlLabel>Select Datasource</ControlLabel>
    <FormControl componentClass="select" value={selected.name} onChange={({ target: { value } }) => onSelect(value)}>
      { datasources.map(d => <option key={d.name} value={d.name}>{d.displayName}</option>) }
    </FormControl>
  </FormGroup>
);

DatasourceSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  selected: PropTypes.object.isRequired,
  datasources: PropTypes.array.isRequired,
};
