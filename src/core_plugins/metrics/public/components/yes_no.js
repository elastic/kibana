import React, { Component, PropTypes } from 'react';

function YesNo(props) {
  const { name, value } = props;
  const handleChange = value => {
    const { name } = props;
    return (e) => {
      const parts = {};
      parts[name] = value;
      props.onChange(parts);
    };
  };
  return (
    <div className="thor__yes_no">
      <label>
        <input
          type="radio"
          name={name}
          checked={Boolean(value)}
          value="yes"
          onChange={handleChange(1)}/>
        Yes</label>
      <label>
        <input
          type="radio"
          name={name}
          checked={!Boolean(value)}
          value="no"
          onChange={handleChange(0)}/>
        No</label>
    </div>
  );
}

YesNo.propTypes = {
  name  : PropTypes.string,
  value : PropTypes.value
};

export default YesNo;
