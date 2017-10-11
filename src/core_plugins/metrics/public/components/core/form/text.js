import PropTypes from 'prop-types';
import React from 'react';
import { Layout } from '../index';

import { htmlIdGenerator } from 'ui_framework/services';
import _ from 'lodash';

const createTextHandler = handleChange => (name, defaultValue) => e => {
  e.preventDefault();
  const value = _.get(e, 'target.value', defaultValue);
  return handleChange({ [name]: value });
};

const Input = ({ name, value, inputRef, label, type = 'text', placeholder, defaultValue, onChange = () => {}, disabled = false, size }) => {
  const htmlId = htmlIdGenerator();
  const handleChange = createTextHandler(onChange);

  return (
    <Layout.Cell size={size}>
      <label className="vis_editor__label" htmlFor={htmlId(name)}>
        {label}
      </label>
      <input
        type={type}
        style={{ width: '100%' }}
        id={htmlId(name)}
        className={`vis_editor__input`}
        value={value || defaultValue || null}
        placeholder={placeholder}
        onChange={handleChange(name)}
        ref={inputRef}
        disabled={disabled}
      />
    </Layout.Cell>
  );
};

Input.propTypes = {
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
  placeholder: PropTypes.string,
  defaultValue: PropTypes.string,
  disabled: PropTypes.bool,
  inputRef: PropTypes.func,
  onChange: PropTypes.func
};
export default Input;
