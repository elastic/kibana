import React from 'react';
import { PillSelect } from '../pill_select';
import PropTypes from 'prop-types';

export const ESFieldsSelect = ({ selected, fields, onChange }) => (
  <PillSelect
    values={selected}
    options={fields}
    onChange={onChange}
  />
);

ESFieldsSelect.propTypes = {
  onChange: PropTypes.func,
  selected: PropTypes.array,
  fields: PropTypes.array,

};
