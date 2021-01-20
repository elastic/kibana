/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import PropTypes from 'prop-types';

export function StringParameter({ id, label, value, setParameter }) {
  const handleChange = (evt) => {
    setParameter(id, evt.target.value);
  };

  return (
    <div className="visEditorSidebar__formRow">
      <label className="visEditorSidebar__formLabel">{label}</label>
      <div className="visEditorSidebar__formControl kuiFieldGroupSection--wide">
        <input className="kuiTextInput" type="text" value={value} onChange={handleChange} />
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
