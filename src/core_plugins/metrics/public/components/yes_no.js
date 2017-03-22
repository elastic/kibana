import React, { PropTypes } from 'react';
import _ from 'lodash';

function YesNo(props) {
  const { name, value } = props;
  const handleChange = value => {
    const { name } = props;
    return () => {
      const parts = { [name]: value };
      props.onChange(parts);
    };
  };
  const inputName = name + _.uniqueId();
  return (
    <div className="thor__yes_no">
      <label>
        <input
          type="radio"
          name={inputName}
          checked={Boolean(value)}
          value="yes"
          onChange={handleChange(1)}/>
        Yes</label>
      <label>
        <input
          type="radio"
          name={inputName}
          checked={!Boolean(value)}
          value="no"
          onChange={handleChange(0)}/>
        No</label>
    </div>
  );
}

YesNo.propTypes = {
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

export default YesNo;
