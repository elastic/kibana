import React from 'react';
import PropTypes from 'prop-types';
import { FormControl, Button } from 'react-bootstrap';
import './advanced_filter.less';

export const AdvancedFilter = ({ value, onChange, commit }) => (
  <form onSubmit={e => { e.preventDefault(); commit(value); }} className="canvas__element__advanced_filter">
    <FormControl className="canvas__element__advanced_filter--input"
      type="text"
      placeholder="Enter text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    <Button onClick={() => commit(value)}>Go</Button>
  </form>
);

AdvancedFilter.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  commit: PropTypes.func,
};
