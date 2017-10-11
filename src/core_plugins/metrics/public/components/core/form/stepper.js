import PropTypes from 'prop-types';
import React from 'react';
import { htmlIdGenerator } from 'ui_framework/services';
import _ from 'lodash';
import { Layout } from '../index';

const createTextHandler = handleChange => (name, defaultValue) => e => {
  e.preventDefault();
  const value = _.get(e, 'target.value', defaultValue);
  return handleChange({ [name]: value });
};

const Input = ({
  name,
  value,
  inputRef,
  label,
  step = '1',
  min,
  max,
  size,
  placeholder,
  defaultValue,
  onChange = () => {},
  disabled = false
}) => {
  const htmlId = htmlIdGenerator();
  const handleChange = createTextHandler(onChange);

  return (
    <Layout.Cell size={size}>
      <label className="vis_editor__label" htmlFor={htmlId(name)}>
        {label}
      </label>
      <input
        type="number"
        step={step}
        id={htmlId(name)}
        min={min}
        max={max}
        className={`vis_editor__input`}
        value={String(value || defaultValue)}
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
  label: PropTypes.string,
  placeholder: PropTypes.string,
  defaultValue: PropTypes.string,
  disabled: PropTypes.bool,
  inputRef: PropTypes.func,
  onChange: PropTypes.func
};
export default Input;
