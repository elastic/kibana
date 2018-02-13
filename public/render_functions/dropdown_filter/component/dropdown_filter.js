import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';
import './dropdown_filter.less';

export const DropdownFilter = ({ value, onChange, commit, choices }) => {
  console.log(value);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        commit(value);
      }}
      className="canvas__element__dropdown_filter"
    >
      <FormControl
        className="canvas__element__dropdown_filter--input"
        componentClass="select"
        placeholder="select"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          commit(e.target.value);
        }}
      >
        <option value="%%CANVAS_MATCH_ALL%%">-- ANY --</option>
        {choices.map(value => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </FormControl>
    </form>
  );
};

DropdownFilter.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  commit: PropTypes.func,
  choices: PropTypes.array,
};
