import React from 'react';

export default ({expression, onChange}) => {
  const change = (e) => onChange(e.target.value);
  return (
    <input className="rework--timelion--expression form-control" onChange={change} value={expression}></input>
  );
};
