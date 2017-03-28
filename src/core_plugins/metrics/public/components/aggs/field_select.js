import React, { PropTypes } from 'react';
import Select from 'react-select';
import generateByTypeFilter from '../lib/generate_by_type_filter';

function FieldSelect(props) {
  const { type, fields, indexPattern } = props;
  if (type === 'count') {
    return null;
  }
  const options = (fields[indexPattern] || [])
    .filter(generateByTypeFilter(props.restrict))
    .map(field => {
      return { label: field.name, value: field.name };
    });

  return (
    <Select
      placeholder="Select field..."
      disabled={props.disabled}
      options={options}
      value={props.value}
      onChange={props.onChange}/>
  );
}

FieldSelect.defaultProps = {
  indexPattern: '*',
  disabled: false,
  restrict: 'none'
};

FieldSelect.propTypes = {
  disabled: PropTypes.bool,
  fields: PropTypes.object,
  indexPattern: PropTypes.string,
  onChange: PropTypes.func,
  restrict: PropTypes.string,
  type: PropTypes.string,
  value: PropTypes.string
};

export default FieldSelect;
