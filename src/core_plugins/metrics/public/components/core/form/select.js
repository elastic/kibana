import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';

import { htmlIdGenerator } from 'ui_framework/services';
import _ from 'lodash';

const createSelectHandler = handleChange => {
  return name => value => {
    if (_.isFunction(handleChange)) {
      return handleChange({
        [name]: (value && value.value) || null
      });
    }
  };
};

const Input = ({ name, value, inputRef, label, placeholder, onChange = () => {}, disabled = false, options = [] }) => {
  const htmlId = htmlIdGenerator();
  const handleChange = createSelectHandler(onChange);

  return (
    <div className="vis_editor__item">
      <label className="vis_editor__label" htmlFor={htmlId(name)}>
        {label}
      </label>
      <div>
        <Select
          style={{ width: '100%' }}
          ref={inputRef}
          placeholder={placeholder}
          inputProps={{ id: htmlId(name) }}
          clearable={false}
          disabled={disabled}
          options={options}
          value={String(value)}
          onChange={handleChange(name)}
        />
      </div>
    </div>
  );
};

Input.propTypes = {
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.string,
  placeholder: PropTypes.string,
  options: PropTypes.array,
  inputRef: PropTypes.func,
  disabled: PropTypes.bool,
  inputRef: PropTypes.func,
  onChange: PropTypes.func
};
export default Input;
