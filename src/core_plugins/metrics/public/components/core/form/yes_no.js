import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';
import { Layout } from '../index';

const YesNo = ({ name, value, label, onChange, size = 'fit' }) => {
  const handleChange = value => {
    return () => {
      const parts = { [name]: value };
      onChange(parts);
    };
  };

  const inputName = name + _.uniqueId();
  return (
    <Layout.Cell size={size} align="center">
      {label && (
        <div className="vis_editor__label" style={{ marginBottom: 8 }}>
          {label}
        </div>
      )}

      <div className="thor__yes_no">
        <label>
          <input type="radio" name={inputName} checked={Boolean(value)} value="yes" onChange={handleChange(1)} />
          Yes
        </label>
        <label>
          <input type="radio" name={inputName} checked={!Boolean(value)} value="no" onChange={handleChange(0)} />
          No
        </label>
      </div>
    </Layout.Cell>
  );
};

YesNo.propTypes = {
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

export default YesNo;
