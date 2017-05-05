import React from 'react';

export const Expression = ({ expression, onChange }) => (
  <textarea
    className="form-control"
    rows="10"
    onChange={(e) => onChange(e.target.value)}
    value={expression}>
  </textarea>
);
