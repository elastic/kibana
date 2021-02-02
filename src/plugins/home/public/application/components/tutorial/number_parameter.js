/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import PropTypes from 'prop-types';

export function NumberParameter({ id, label, value, setParameter }) {
  const handleChange = (evt) => {
    setParameter(id, parseFloat(evt.target.value));
  };

  return (
    <div className="visEditorSidebar__formRow">
      <label className="visEditorSidebar__formLabel" htmlFor={id}>
        {label}
      </label>
      <div className="visEditorSidebar__formControl kuiFieldGroupSection--wide">
        <input
          className="kuiTextInput"
          type="number"
          value={value}
          onChange={handleChange}
          id={id}
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
