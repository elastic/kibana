import React from 'react';
import PropTypes from 'prop-types';

export function NumberParameter({ id, label, value, setParameter }) {
  const handleChange = (evt) => {
    setParameter(id, parseFloat(evt.target.value));
  };

  return (
    <div className="kuiSideBarFormRow">
      <label
        className="kuiSideBarFormRow__label"
      >
        {label}
      </label>
      <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
        <input
          className="kuiTextInput"
          type="number"
          value={value}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

NumberParameter.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  setParameter: PropTypes.func.isRequired,
};
