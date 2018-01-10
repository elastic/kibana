import React from 'react';
import PropTypes from 'prop-types';
import { PillSelect } from '../pill_select';

export const ESFieldsSelect = ({ selected, fields, onChange }) => (
  <PillSelect values={selected} options={fields} onChange={onChange} />
);

ESFieldsSelect.propTypes = {
  onChange: PropTypes.func,
  selected: PropTypes.array,
  fields: PropTypes.array,
};
