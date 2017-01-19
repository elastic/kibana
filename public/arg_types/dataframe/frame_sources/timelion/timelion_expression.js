import React from 'react';

export default ({expression, onChange}) => {
  const change = (e) => onChange(e.target.value);
  return (
    <input className="form-control" onChange={change} value={expression}></input>
  );
};
