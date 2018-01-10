import React from 'react';
import PropTypes from 'prop-types';

export function StringParameter({ id, label, value, setParameter }) {
  const handleChange = (evt) => {
    setParameter(id, evt.target.value);
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
          type="text"
          value={value}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

StringParameter.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  setParameter: PropTypes.func.isRequired,
};
